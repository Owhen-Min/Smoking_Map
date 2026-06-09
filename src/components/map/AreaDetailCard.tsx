"use client";

import { useEffect, useState } from "react";
import { SmokingArea } from "@/types/smoking";
import { likeSmokingAreaImage } from "@/services/smokingArea";
import { getLikedImageIds, markImageLiked } from "@/lib/photoLikes";
import PhotoUploadModal from "@/components/map/PhotoUploadModal";

interface Props {
  area: SmokingArea;
  onClose: () => void;
  onEditLocation: (area: SmokingArea) => void;
  onPhotoUploadSuccess: () => void;
}

export default function AreaDetailCard({ area, onClose, onEditLocation, onPhotoUploadSuccess }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [likedImageIds, setLikedImageIds] = useState<string[]>([]);
  const [isLiking, setIsLiking] = useState(false);

  // 다른 마커 선택 시 area prop만 바뀌므로 좋아요 여부를 다시 조회하고 인덱스 초기화
  useEffect(() => {
    setLikedImageIds(getLikedImageIds());
    setCurrentImageIndex(0);
  }, [area.id]);

  const handleLikeImage = async (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation();
    if (likedImageIds.includes(imageId) || isLiking) return;

    setIsLiking(true);
    try {
      await likeSmokingAreaImage(imageId);
      markImageLiked(imageId);
      setLikedImageIds((prev) => [...prev, imageId]);
      onPhotoUploadSuccess(); // 좋아요 수/대표사진 변경분 갱신
    } catch (err: any) {
      console.error("사진 좋아요 오류:", err);
      alert(err.message || "좋아요 처리에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsLiking(false);
    }
  };

  const formattedDate = area.last_updated_at ? (() => {
    const d = new Date(area.last_updated_at);
    return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  })() : '-';

  const getAccuracyBadge = (accuracy: "high" | "medium" | "low") => {
    switch (accuracy) {
      case "low":
        return (
          <span className="text-xs px-2 py-0.5 bg-accuracy-low/10 text-accuracy-low rounded font-medium flex items-center gap-1">
            정확도: 낮음 🔴
          </span>
        );
      case "medium":
        return (
          <span className="text-xs px-2 py-0.5 bg-accuracy-medium/10 text-accuracy-medium rounded font-medium flex items-center gap-1">
            정확도: 보통 🟡
          </span>
        );
      case "high":
      default:
        return (
          <span className="text-xs px-2 py-0.5 bg-accuracy-high/10 text-accuracy-high rounded font-medium flex items-center gap-1">
            정확도: 높음 🟢
          </span>
        );
    }
  };

  // 1. 축소된 상태 (간략한 정보)
  if (!isExpanded) {
    return (
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-surface rounded-2xl shadow-xl z-20 p-4 transition-all duration-300 cursor-pointer"
        onClick={() => setIsExpanded(true)}
      >
        <div className="h-48 bg-foreground/10 relative hidden md:block rounded-xl overflow-hidden mb-3">
          {area.smoking_area_images && area.smoking_area_images.length > 0 ? (
            <img
              src={area.smoking_area_images[0].image_url_sd}
              alt="흡연구역 썸네일"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-foreground/50">
              <span className="text-2xl mb-2">📸</span>
              <span className="text-sm">등록된 사진이 없습니다</span>
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute top-4 right-5 text-foreground/50 hover:text-foreground p-1 transition-colors"
        >
          ✕
        </button>
        <div className="pr-6 mb-3">
          <h3 className="font-bold text-foreground text-lg truncate">{area.name || area.description || "이름 없는 흡연구역"}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded font-medium">
              최근 확인: {formattedDate}
            </span>
            <span className="text-xs px-2 py-0.5 bg-foreground/10 text-foreground/70 rounded">
              {area.source === "public" ? "공공" : "제보"}
            </span>
            {getAccuracyBadge(area.accuracy)}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="flex-1 py-2.5 bg-kakao text-kakao-text rounded-xl text-sm font-bold text-center hover:brightness-95 transition-all cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://map.kakao.com/link/to/${encodeURIComponent(area.address || area.name || '흡연구역')},${area.lat},${area.lng}`);
            }}
          >
            길찾기
          </button>
          <button
            className="flex-1 py-2.5 bg-foreground/5 hover:bg-foreground/10 rounded-xl text-sm font-bold text-foreground text-center transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
          >
            자세히 보기
          </button>
        </div>
      </div>
    );
  }

  // 2. 확장된 상태 (상세 정보)
  const hasImages = area.smoking_area_images && area.smoking_area_images.length > 0;
  const currentImage = hasImages ? area.smoking_area_images![currentImageIndex] : null;

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-surface rounded-2xl shadow-xl z-20 overflow-hidden transition-all duration-300 border border-foreground/5">
      {/* 이미지 영역 */}
      <div className="h-48 bg-foreground/10 relative group">
        {hasImages ? (
          <>
            <img
              src={currentImage!.image_url_hd}
              alt={`흡연구역 사진 ${currentImageIndex + 1}`}
              className="w-full h-full object-cover"
            />
            {/* 사진 좋아요 버튼 + 대표사진 배지 */}
            <div className="absolute top-3 right-14 flex items-center gap-1.5 z-10">
              {currentImage!.is_primary && (
                <span className="bg-primary/90 text-white text-xs px-2 py-1 rounded-full font-semibold">
                  ⭐ 대표
                </span>
              )}
              <button
                onClick={(e) => handleLikeImage(e, currentImage!.id)}
                disabled={likedImageIds.includes(currentImage!.id) || isLiking}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold transition-all ${
                  likedImageIds.includes(currentImage!.id)
                    ? "bg-danger/90 text-white cursor-default"
                    : "bg-black/60 hover:bg-black/80 text-white cursor-pointer disabled:opacity-60"
                }`}
                title={
                  likedImageIds.includes(currentImage!.id)
                    ? "이미 좋아요를 누른 사진입니다"
                    : "이 사진이 마음에 들면 좋아요를 눌러주세요. 좋아요가 가장 많은 사진이 대표사진이 됩니다."
                }
              >
                <span>{likedImageIds.includes(currentImage!.id) ? "❤️" : "🤍"}</span>
                <span>{currentImage!.like_count ?? 0}</span>
              </button>
            </div>
            {/* 좌우 네비게이션 버튼 (사진이 여러 개일 때만 표시) */}
            {area.smoking_area_images!.length > 1 && (
              <>
                {currentImageIndex > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) => prev - 1);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white rounded-full w-8 h-8 flex items-center justify-center transition-all z-10 font-bold cursor-pointer"
                  >
                    ‹
                  </button>
                )}
                {currentImageIndex < area.smoking_area_images!.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) => prev + 1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white rounded-full w-8 h-8 flex items-center justify-center transition-all z-10 font-bold cursor-pointer"
                  >
                    ›
                  </button>
                )}
                {/* 사진 번호 표시 피액 */}
                <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full font-medium z-10">
                  {currentImageIndex + 1} / {area.smoking_area_images!.length}
                </span>
                {/* 도트 인디케이터 */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {area.smoking_area_images!.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(idx);
                      }}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                        idx === currentImageIndex ? "bg-white w-3" : "bg-white/50 hover:bg-white/80"
                      }`}
                      aria-label={`${idx + 1}번째 사진으로 이동`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-foreground/50">
            <span className="text-2xl mb-2">📸</span>
            <span className="text-sm">등록된 사진이 없습니다</span>
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
          className="absolute top-3 left-3 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors z-10 cursor-pointer"
          title="간략히 보기"
        >
          ↓
        </button>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors z-10 cursor-pointer"
          title="닫기"
        >
          ✕
        </button>
      </div>

      {/* 정보 영역 */}
      <div className="p-5">
        <h3 className="font-bold text-foreground text-xl mb-2">{area.name || area.description || "이름 없는 흡연구역"}</h3>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded font-medium">
            {area.source === "public" ? "공공" : "제보"}
          </span>
          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded font-medium">
            최근 확인: {formattedDate}
          </span>
          {getAccuracyBadge(area.accuracy)}
        </div>

        {area.description && area.name && (
          <p className="text-sm text-foreground/75 mb-3 px-1">
            {area.description}
          </p>
        )}

        {area.address && (
          <p className="text-sm text-foreground/80 mb-6 bg-background p-3 rounded-lg border border-foreground/5">
            {area.address}
          </p>
        )}

        {/* 버튼 그룹 */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="py-2.5 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded-xl text-sm font-medium transition-colors cursor-pointer"
          >
            📷 사진 등록
          </button>
          <button
            onClick={() => onEditLocation(area)}
            className="py-2.5 bg-foreground/5 hover:bg-primary/10 rounded-xl text-sm font-medium text-primary transition-colors cursor-pointer"
          >
            📌 위치 수정
          </button>
          <button className="py-2.5 bg-foreground/5 hover:bg-danger/10 rounded-xl text-sm font-medium text-danger transition-colors cursor-pointer">
            🚨 제거 요청
          </button>
        </div>
        <button
          className="w-full py-3.5 bg-kakao hover:brightness-95 text-kakao-text rounded-xl text-base font-bold transition-all cursor-pointer"
          onClick={() =>
            window.open(
              `https://map.kakao.com/link/to/${encodeURIComponent(area.address || area.name || '흡연구역')},${area.lat},${area.lng}`,
            )
          }
        >
          카카오맵으로 길찾기
        </button>
      </div>

      {/* 사진 업로드 전용 모달 */}
      <PhotoUploadModal
        area={area}
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={onPhotoUploadSuccess}
      />
    </div>
  );
}
