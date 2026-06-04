"use client";

import { useState, useEffect, useRef } from "react";

interface Suggestion {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: "place" | "address";
}

interface SearchBarProps {
  onSelectLocation: (lat: number, lng: number, name: string) => void;
}

export default function SearchBar({ onSelectLocation }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 외부 클릭 시 검색 제안 레이어 닫기
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // 입력창 변경 시 Kakao 검색 서비스 실행 (디바운스 적용)
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(() => {
      searchKakao(query);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const searchKakao = (searchQuery: string) => {
    if (typeof window === "undefined" || !window.kakao || !window.kakao.maps) return;

    const places = new window.kakao.maps.services.Places();
    const geocoder = new window.kakao.maps.services.Geocoder();

    let combinedResults: Suggestion[] = [];

    // 1. 키워드 장소 검색 (예: 지하철역, 건물명, 상호명 등)
    places.keywordSearch(searchQuery, (placeData: any, placeStatus: any) => {
      if (placeStatus === window.kakao.maps.services.Status.OK) {
        const placeSuggestions: Suggestion[] = placeData.map((item: any) => ({
          id: `place-${item.id}`,
          name: item.place_name,
          address: item.road_address_name || item.address_name,
          lat: parseFloat(item.y),
          lng: parseFloat(item.x),
          type: "place",
        }));
        combinedResults = [...combinedResults, ...placeSuggestions];
      }

      // 2. 주소 검색 (예: 지번 주소, 도로명 주소 등)
      geocoder.addressSearch(searchQuery, (addressData: any, addressStatus: any) => {
        if (addressStatus === window.kakao.maps.services.Status.OK) {
          const addressSuggestions: Suggestion[] = addressData.map((item: any, idx: number) => ({
            id: `address-${idx}-${item.address_name}`,
            name: item.address_name,
            address: item.road_address?.address_name || item.address?.address_name || "",
            lat: parseFloat(item.y),
            lng: parseFloat(item.x),
            type: "address",
          }));

          // 장소 검색 결과와 중복되는 좌표 제거
          const filteredAddress = addressSuggestions.filter(
            (addr) => !combinedResults.some((res) => Math.abs(res.lat - addr.lat) < 0.0001 && Math.abs(res.lng - addr.lng) < 0.0001)
          );

          combinedResults = [...combinedResults, ...filteredAddress];
        }

        // 최대 8개의 결과만 노출하여 뷰포트 오버플로우 방지
        setSuggestions(combinedResults.slice(0, 8));
        setIsOpen(combinedResults.length > 0);
      });
    });
  };

  const handleSelect = (item: Suggestion) => {
    onSelectLocation(item.lat, item.lng, item.name);
    setQuery(item.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-4 left-[76px] z-50 flex flex-col w-[calc(100vw-92px)] sm:w-[320px] md:w-[380px]"
    >
      {/* 검색 바 입력 필드 */}
      <div className="relative flex items-center w-full h-12 bg-surface text-foreground rounded-full shadow-md border border-foreground/5 hover:shadow-lg focus-within:shadow-lg focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all duration-300">
        {/* 돋보기 아이콘 */}
        <div className="pl-4 text-foreground/40">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z"
            />
          </svg>
        </div>

        {/* 텍스트 입력창 */}
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value) setIsOpen(false);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder="주소 또는 지하철역 검색..."
          className="w-full h-full px-3 text-sm bg-transparent outline-none border-none placeholder-foreground/30 text-foreground font-medium"
        />

        {/* 입력값 초기화 (X) 버튼 */}
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 p-1 rounded-full text-foreground/45 hover:bg-foreground/5 active:scale-90 transition-all cursor-pointer"
            aria-label="검색어 지우기"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 검색 추천 리스트 드롭다운 */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-[54px] left-0 w-full bg-surface border border-foreground/5 rounded-2xl shadow-xl overflow-hidden z-50 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          <ul className="py-2.5">
            {suggestions.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleSelect(item)}
                  className="w-full text-left px-4 py-3 hover:bg-foreground/5 active:bg-foreground/10 transition-colors duration-150 flex flex-col gap-0.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {/* 타입별 뱃지 아이콘 */}
                    {item.type === "place" ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        장소
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-kakao/10 text-kakao">
                        주소
                      </span>
                    )}
                    <span className="text-sm font-semibold text-foreground truncate max-w-[80%]">
                      {item.name}
                    </span>
                  </div>
                  {item.address && (
                    <span className="text-xs text-foreground/50 pl-0 truncate w-full">
                      {item.address}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
