"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useSmokingAreas } from "@/hooks/useSmokingAreas";
import { useMapGeolocation } from "@/hooks/useMapGeolocation";
import { getMarkerImage, getAddressFromCoords } from "@/lib/map";
import { updateSmokingAreaLocation } from "@/services/smokingArea";
import { SmokingArea } from "@/types/smoking";
import AreaDetailCard from "@/components/map/AreaDetailCard";
import DarkModeToggleButton from "@/components/map/DarkModeToggleButton";

export default function KakaoMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]); // 마커 관리용 Ref

  const { data, refetch } = useSmokingAreas();
  const [isLoaded, setIsLoaded] = useState(false);

  // 선택된 마커 정보를 담을 상태
  const [selectedArea, setSelectedArea] = useState<SmokingArea | null>(null);

  // 위치 수정 관련 상태들
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editingArea, setEditingArea] = useState<SmokingArea | null>(null);
  const [tempLocation, setTempLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [tempAddress, setTempAddress] = useState<string>("");
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  // 커스텀 훅으로 위치 조회/트래킹 기능 분리
  const { isLocating, handleGoToMyLocation, startTracking } = useMapGeolocation({
    mapInstance,
  });

  // 지도 인스턴스 초기화 및 트래킹 시작
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current) return;

    window.kakao.maps.load(() => {
      const options = {
        center: new window.kakao.maps.LatLng(37.5665, 126.978),
        level: 3,
      };
      const map = new window.kakao.maps.Map(mapContainerRef.current, options);
      mapInstance.current = map;

      // 백그라운드 실시간 위치 트래킹 개시
      startTracking();
    });
  }, [isLoaded]);

  // 흡연구역 마커들 생성 및 클릭 이벤트 처리
  useEffect(() => {
    if (!mapInstance.current || !data) return;

    // 기존 마커 제거 (데이터 업데이트 시 중복 방지)
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    data.forEach((item: SmokingArea) => {
      const markerImage = getMarkerImage(item.accuracy);
      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(item.lat, item.lng),
        map: mapInstance.current,
        image: markerImage,
      });

      // 마커 클릭 이벤트 핸들러
      window.kakao.maps.event.addListener(marker, "click", () => {
        // 위치 수정 모드가 아닐 때만 마커 클릭 가능
        if (isEditingLocation) return;
        
        setSelectedArea(item); // 상세 정보 출력 상태 설정
        mapInstance.current.panTo(marker.getPosition()); // 해당 위치로 부드럽게 스크롤
      });

      markersRef.current.push(marker);
    });
  }, [data, isEditingLocation]);

  // 위치 수정 모드일 때 지도 움직임(idle) 감지하여 주소 변환
  useEffect(() => {
    if (!mapInstance.current || !isEditingLocation) return;

    const handleMapIdle = async () => {
      const center = mapInstance.current.getCenter();
      const lat = center.getLat();
      const lng = center.getLng();
      setTempLocation({ lat, lng });
      
      try {
        const address = await getAddressFromCoords(lat, lng);
        setTempAddress(address);
      } catch (err) {
        console.error("역지오코딩 실패:", err);
        setTempAddress("주소를 불러올 수 없는 위치입니다.");
      }
    };

    // 초기 1회 실행 (진입 시 중심점 주소 가져오기)
    handleMapIdle();

    // idle 이벤트 등록 (지도가 완전히 멈췄을 때 감지)
    window.kakao.maps.event.addListener(mapInstance.current, "idle", handleMapIdle);

    return () => {
      if (mapInstance.current && window.kakao?.maps?.event) {
        window.kakao.maps.event.removeListener(mapInstance.current, "idle", handleMapIdle);
      }
    };
  }, [isEditingLocation]);

  const handleStartEditLocation = (area: SmokingArea) => {
    setSelectedArea(null); // 상세 카드 닫기
    setEditingArea(area);
    setIsEditingLocation(true);
    setTempLocation({ lat: area.lat, lng: area.lng });
    setTempAddress(area.address || "");
    
    // 지도의 중심을 해당 흡연구역 위치로 이동
    if (mapInstance.current) {
      const moveLatLng = new window.kakao.maps.LatLng(area.lat, area.lng);
      mapInstance.current.panTo(moveLatLng);
    }
  };

  const handleCancelEditLocation = () => {
    setIsEditingLocation(false);
    setEditingArea(null);
    setTempLocation(null);
    setTempAddress("");
  };

  const handleSaveEditLocation = async () => {
    if (!editingArea || !tempLocation) return;

    setIsSavingLocation(true);
    try {
      await updateSmokingAreaLocation(
        editingArea.id,
        tempLocation.lat,
        tempLocation.lng,
        tempAddress
      );
      
      alert("흡연구역 위치 정보가 성공적으로 수정되었습니다.");
      setIsEditingLocation(false);
      setEditingArea(null);
      setTempLocation(null);
      setTempAddress("");
      
      // 데이터 갱신
      await refetch();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "위치 정보 수정에 실패했습니다.");
    } finally {
      setIsSavingLocation(false);
    }
  };

  return (
    <div className="w-full absolute right-0 top-0">
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_KEY}&libraries=services&autoload=false`}
        onLoad={() => setIsLoaded(true)} // 스크립트 로드 완료 시 상태 변경
        strategy="afterInteractive" // 인터랙티브한 시점에 로드
      />
      <div
        ref={mapContainerRef}
        style={{ width: "100%", height: "100dvh" }}
        className="kakao-map-container"
      />

      <DarkModeToggleButton />

      {/* 내 위치로 이동 버튼 - 위치 수정 중이 아닐 때만 표시 */}
      {!isEditingLocation && (
        <button
          onClick={handleGoToMyLocation}
          className="absolute bottom-6 right-6 z-30 p-3.5 rounded-full bg-surface shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center text-foreground border border-foreground/5 cursor-pointer"
          aria-label="내 위치로 이동"
          disabled={isLocating}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className={`w-6 h-6 text-primary ${isLocating ? "animate-spin" : ""}`}
          >
            {isLocating ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            ) : (
              <>
                <circle cx="12" cy="12" r="4" fill="currentColor" className="opacity-15 text-primary" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v3m0 12v3M3 12h3m12 0h3m-9-6a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"
                />
              </>
            )}
          </svg>
        </button>
      )}

      {/* 위치 수정 모드일 때 화면 중앙에 뜨는 고정 핀 */}
      {isEditingLocation && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-20 pointer-events-none mb-[23px] flex flex-col items-center select-none active:scale-95 transition-all duration-300">
          {/* 가이드 말풍선 */}
          <div className="bg-foreground text-background text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg mb-2 relative flex items-center whitespace-nowrap animate-bounce">
            여기로 위치 수정
            <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45" />
          </div>
          {/* 붉은색 선택 핀 이미지 */}
          <img
            src="/pins/pin-red.svg"
            className="w-9 h-[46px] filter drop-shadow-md"
            alt="선택 핀"
          />
        </div>
      )}

      {/* 위치 수정 제어 하단 팝업 */}
      {isEditingLocation && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-surface rounded-2xl shadow-xl z-30 p-5 border border-foreground/5 animate-fade-in flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 bg-danger/10 text-danger rounded-full uppercase">
                Location Edit
              </span>
            </div>
            <h3 className="font-bold text-foreground text-lg mt-2 truncate">
              {editingArea?.name || "흡연구역"} 위치 수정
            </h3>
            <p className="text-xs text-foreground/50 mt-0.5">
              지도를 드래그하여 핀의 위치를 미세 조정해 주세요.
            </p>
          </div>

          <div className="bg-background/80 backdrop-blur-md p-4 rounded-xl border border-foreground/5 flex items-center gap-3">
            <span className="text-xl">📍</span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-foreground/40 font-semibold tracking-wide uppercase">
                현재 선택된 위치 주소
              </div>
              <div className="text-sm text-foreground font-semibold truncate mt-0.5">
                {tempAddress || "주소를 분석하고 있습니다..."}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCancelEditLocation}
              disabled={isSavingLocation}
              className="flex-1 py-3 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSaveEditLocation}
              disabled={isSavingLocation || !tempLocation || !tempAddress}
              className="flex-[2] py-3 bg-primary text-primary-foreground hover:brightness-105 rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSavingLocation ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                  저장 중...
                </>
              ) : (
                "위치 수정 완료"
              )}
            </button>
          </div>
        </div>
      )}

      {/* 상세 정보 오버레이 */}
      {selectedArea && !isEditingLocation && (
        <AreaDetailCard
          area={selectedArea}
          onClose={() => setSelectedArea(null)}
          onEditLocation={handleStartEditLocation}
        />
      )}
    </div>
  );
}
