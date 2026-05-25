import { useState } from "react";
import { SmokingArea } from "@/types/smoking";

interface Props {
  area: SmokingArea;
  onClose: () => void;
}

export default function AreaDetailCard({ area, onClose }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

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
        <div className="h-48 bg-foreground/10 relative hidden md:block">
          {area.smoking_area_images && area.smoking_area_images.length > 0 ? (
            <img
              src={area.smoking_area_images[0].image_url}
              alt="흡연구역"
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
          <h3 className="font-bold text-foreground text-lg truncate">{area.name}</h3>
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
            className="flex-1 py-2.5 bg-kakao text-kakao-text rounded-xl text-sm font-bold text-center hover:brightness-95 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://map.kakao.com/link/to/${encodeURIComponent(area.address || area.name)},${area.lat},${area.lng}`);
            }}
          >
            길찾기
          </button>
          <button
            className="flex-1 py-2.5 bg-foreground/5 hover:bg-foreground/10 rounded-xl text-sm font-bold text-foreground text-center transition-colors"
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
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-surface rounded-2xl shadow-xl z-20 overflow-hidden transition-all duration-300">
      {/* 이미지 영역 */}
      <div className="h-48 bg-foreground/10 relative">
        {area.smoking_area_images && area.smoking_area_images.length > 0 ? (
          <img
            src={area.smoking_area_images[0].image_url}
            alt="흡연구역"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-foreground/50">
            <span className="text-2xl mb-2">📸</span>
            <span className="text-sm">등록된 사진이 없습니다</span>
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
          className="absolute top-3 left-3 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
        >
          ↓
        </button>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
        >
          ✕
        </button>
      </div>

      {/* 정보 영역 */}
      <div className="p-5">
        <h3 className="font-bold text-foreground text-xl mb-2">{area.description || area.name}</h3>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded font-medium">
            {area.source === "public" ? "공공" : "제보"}
          </span>
          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded font-medium">
            최근 확인: {formattedDate}
          </span>
          {getAccuracyBadge(area.accuracy)}
        </div>

        {area.address && (
          <p className="text-sm text-foreground/80 mb-6 bg-background p-3 rounded-lg">
            {area.address}
          </p>
        )}

        {/* 버튼 그룹 */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          <button className="py-2.5 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded-xl text-sm font-medium transition-colors">
            📷 사진 등록
          </button>
          <button className="py-2.5 bg-foreground/5 hover:bg-primary/10 rounded-xl text-sm font-medium text-primary transition-colors">
            📌 위치 수정
          </button>
          <button className="py-2.5 bg-foreground/5 hover:bg-danger/10 rounded-xl text-sm font-medium text-danger transition-colors">
            🚨 제거 요청
          </button>
        </div>
        <button
          className="w-full py-3.5 bg-kakao hover:brightness-95 text-kakao-text rounded-xl text-base font-bold transition-all"
          onClick={() =>
            window.open(
              `https://map.kakao.com/link/to/${encodeURIComponent(area.address || area.name)},${area.lat},${area.lng}`,
            )
          }
        >
          카카오맵으로 길찾기
        </button>
      </div>
    </div>
  );
}
