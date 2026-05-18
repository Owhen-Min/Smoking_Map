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

  // 1. 축소된 상태 (간략한 정보)
  if (!isExpanded) {
    return (
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white rounded-2xl shadow-xl z-20 p-4 transition-all duration-300 cursor-pointer"
        onClick={() => setIsExpanded(true)}
      >
        <div className="h-48 bg-gray-200 relative hidden md:block">
          {area.smoking_area_images && area.smoking_area_images.length > 0 ? (
            <img
              src={area.smoking_area_images[0].image_url}
              alt="흡연구역"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <span className="text-2xl mb-2">📸</span>
              <span className="text-sm">등록된 사진이 없습니다</span>
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute top-4 right-5 text-gray-400 hover:text-gray-600 p-1"
        >
          ✕
        </button>
        <div className="pr-6 mb-3">
          <h3 className="font-bold text-gray-800 text-lg truncate">{area.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded font-medium">
              최근 확인: {formattedDate}
            </span>
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
              {area.source === "public" ? "공공" : "제보"}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="flex-1 py-2.5 bg-yellow-400 rounded-xl text-sm font-bold text-center"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://map.kakao.com/link/to/${encodeURIComponent(area.address || area.name)},${area.lat},${area.lng}`);
            }}
          >
            길찾기
          </button>
          <button
            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold text-gray-700 text-center transition-colors"
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
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white rounded-2xl shadow-xl z-20 overflow-hidden transition-all duration-300">
      {/* 이미지 영역 */}
      <div className="h-48 bg-gray-200 relative">
        {area.smoking_area_images && area.smoking_area_images.length > 0 ? (
          <img
            src={area.smoking_area_images[0].image_url}
            alt="흡연구역"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
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
        <h3 className="font-bold text-gray-800 text-xl mb-2">{area.description || area.name}</h3>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded">
            {area.source === "public" ? "공공" : "제보"}
          </span>
          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded">
            최근 확인: {formattedDate}
          </span>
        </div>

        {area.address && (
          <p className="text-sm text-gray-600 mb-6 bg-gray-50 p-3 rounded-lg">
            {area.address}
          </p>
        )}

        {/* 버튼 그룹 */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          <button className="py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors">
            📷 사진 등록
          </button>
          <button className="py-2.5 bg-gray-100 hover:bg-blue-50 rounded-xl text-sm font-medium text-blue-500 transition-colors">
            📌 위치 수정
          </button>
          <button className="py-2.5 bg-gray-100 hover:bg-red-50 rounded-xl text-sm font-medium text-red-500 transition-colors">
            🚨 제거 요청
          </button>
        </div>
        <button
          className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-500 rounded-xl text-base font-bold transition-colors"
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
