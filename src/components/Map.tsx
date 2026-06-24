"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useSmokingAreas } from "@/hooks/useSmokingAreas";
import { useMapGeolocation } from "@/hooks/useMapGeolocation";
import { getMarkerImage } from "@/lib/map";
import { checkReportLimit, incrementReportCount, MAX_REPORTS_PER_DAY } from "@/lib/rateLimit";
import { updateSmokingAreaLocation, createSmokingAreaReport } from "@/services/smokingArea";
import { SmokingArea } from "@/types/smoking";
import AreaDetailCard from "@/components/map/AreaDetailCard";
import DarkModeToggleButton from "@/components/map/DarkModeToggleButton";
import LocationSelectModal from "@/components/map/LocationSelectModal";
import ReportDetailsModal from "@/components/map/ReportDetailsModal";
import SearchBar from "@/components/map/SearchBar";

export default function KakaoMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]); // 마커 관리용 Ref

  const { data, refetch } = useSmokingAreas();
  const [isLoaded, setIsLoaded] = useState(false);

  // 선택된 마커 정보를 담을 상태
  const [selectedArea, setSelectedArea] = useState<SmokingArea | null>(null);

  // 위치 수정 모달 관련 상태들
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<SmokingArea | null>(null);

  // 제보 관련 상태들
  const [isReportLocationModalOpen, setIsReportLocationModalOpen] = useState(false);
  const [isReportDetailsModalOpen, setIsReportDetailsModalOpen] = useState(false);
  const [reportCoords, setReportCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [reportAddress, setReportAddress] = useState<string>("");

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
        setSelectedArea(item); // 상세 정보 출력 상태 설정
        mapInstance.current.panTo(marker.getPosition()); // 해당 위치로 부드럽게 스크롤
      });

      markersRef.current.push(marker);
    });
  }, [data]);

  // --- 위치 수정 핸들러 ---
  const handleStartEditLocation = (area: SmokingArea) => {
    setSelectedArea(null); // 상세 카드 닫기
    setEditingArea(area);
    setIsLocationModalOpen(true);
  };

  const handleConfirmLocationEdit = async (lat: number, lng: number, address: string) => {
    if (!editingArea) return;

    try {
      await updateSmokingAreaLocation(
        editingArea.id,
        lat,
        lng,
        address
      );

      alert("흡연구역 위치 정보가 성공적으로 수정되었습니다.");
      setIsLocationModalOpen(false);
      setEditingArea(null);

      // 데이터 갱신
      await refetch();
    } catch (err: any) {
      console.error("위치 수정 오류:", err);
      alert(
        err.message?.includes("permission denied")
          ? "데이터 수정 권한이 없습니다. (Supabase RLS/Privilege 제한)"
          : err.message || "위치 정보 수정에 실패했습니다."
      );
      throw err;
    }
  };

  // --- 신규 제보 핸들러 ---
  const handleStartReport = () => {
    setSelectedArea(null); // 상세 카드 닫기

    // 레이트 리밋 검사 추가
    const { allowed } = checkReportLimit();
    if (!allowed) {
      alert(`오늘 제보 횟수 초과(최대 ${MAX_REPORTS_PER_DAY}회)하여 더 이상 제보할 수 없습니다.`);
      return;
    }

    // 현재 지도의 중심 좌표 획득하여 제보 모달의 기본값으로 설정
    let currentCenter = { lat: 37.5665, lng: 126.978 };
    if (mapInstance.current) {
      const center = mapInstance.current.getCenter();
      currentCenter = { lat: center.getLat(), lng: center.getLng() };
    }

    setReportCoords(currentCenter);
    setReportAddress("");
    setIsReportLocationModalOpen(true);
  };

  const handleConfirmReportLocation = async (lat: number, lng: number, address: string) => {
    setReportCoords({ lat, lng });
    setReportAddress(address);
    setIsReportLocationModalOpen(false); // 위치 모달 닫고
    setIsReportDetailsModalOpen(true);   // 인풋 폼 모달 열기
  };

  const handleConfirmReportDetails = async (name: string, description: string, address: string) => {
    if (!reportCoords) return;

    // 레이트 리밋 한 번 더 검증
    const { allowed } = checkReportLimit();
    if (!allowed) {
      alert(`오늘 제보 횟수 초과(최대 ${MAX_REPORTS_PER_DAY}회)하여 더 이상 제보할 수 없습니다.`);
      setIsReportDetailsModalOpen(false);
      setReportCoords(null);
      setReportAddress("");
      return;
    }

    try {
      await createSmokingAreaReport({
        name,
        lat: reportCoords.lat,
        lng: reportCoords.lng,
        address,
        description,
      });

      // 성공 시 카운트 증가
      incrementReportCount();

      alert("성공적으로 제보가 완료되었습니다! 즉시 지도상에 등록되었습니다.");
      setIsReportDetailsModalOpen(false);
      setReportCoords(null);
      setReportAddress("");

      // 데이터 갱신
      await refetch();
    } catch (err: any) {
      console.error("제보 등록 오류:", err);
      alert(err.message || "제보 등록에 실패했습니다.");
      throw err;
    }
  };

  // --- 흡연구역 데이터 갱신 핸들러 (사진 등록/확인 등 변경 발생 시) ---
  const handleAreaDataRefresh = async () => {
    try {
      const updatedAreas = await refetch();
      if (selectedArea && updatedAreas) {
        const updated = updatedAreas.find((a: SmokingArea) => a.id === selectedArea.id);
        if (updated) {
          setSelectedArea(updated);
        }
      }
    } catch (err) {
      console.error("흡연구역 데이터 갱신 에러:", err);
    }
  };


  // --- 주소지/역 검색 핸들러 ---
  const handleSelectLocation = (lat: number, lng: number) => {
    if (!mapInstance.current) return;
    const moveLatLng = new window.kakao.maps.LatLng(lat, lng);
    mapInstance.current.setCenter(moveLatLng);
    mapInstance.current.setLevel(3); // 지도 줌 레벨을 3으로 확대
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
      <SearchBar onSelectLocation={handleSelectLocation} />

      {/* 내 위치로 이동 및 제보하기 버튼 - 모달이 열려있지 않을 때만 표시 */}
      {!(isLocationModalOpen || isReportLocationModalOpen || isReportDetailsModalOpen) && (
        <>
          {/* 내 위치로 이동 버튼 - 제보하기 버튼과의 세로 배치를 위해 바텀 여백을 88px로 조정 */}
          <button
            onClick={handleGoToMyLocation}
            className="absolute bottom-[88px] right-6 z-30 p-3.5 rounded-full bg-surface shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center text-foreground border border-foreground/5 cursor-pointer"
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

          {/* 신규 흡연구역 제보 버튼 */}
          <button
            onClick={handleStartReport}
            className="absolute bottom-6 right-6 z-30 px-5 py-3.5 rounded-full bg-primary text-white font-bold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer border border-white/10 dark:border-black/5"
            aria-label="흡연구역 제보"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.8}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="text-sm tracking-wide">제보하기</span>
          </button>
        </>
      )}

      {/* 상세 정보 오버레이 */}
      {selectedArea && (
        <AreaDetailCard
          area={selectedArea}
          onClose={() => setSelectedArea(null)}
          onEditLocation={handleStartEditLocation}
          onPhotoUploadSuccess={handleAreaDataRefresh}
          onAreaUpdated={handleAreaDataRefresh}
        />
      )}

      {/* 위치 수정용 전용 팝업 모달 */}
      {isLocationModalOpen && editingArea && (
        <LocationSelectModal
          isOpen={isLocationModalOpen}
          onClose={() => {
            setIsLocationModalOpen(false);
            setEditingArea(null);
          }}
          initialLat={editingArea.lat}
          initialLng={editingArea.lng}
          initialAddress={editingArea.address || ""}
          title={`${editingArea.name || "흡연구역"} 위치 수정`}
          mode="edit"
          allAreas={data}
          editingAreaAccuracy={editingArea.accuracy}
          onConfirm={handleConfirmLocationEdit}
        />
      )}

      {/* 신규 제보 위치 선택용 전용 팝업 모달 */}
      {isReportLocationModalOpen && reportCoords && (
        <LocationSelectModal
          isOpen={isReportLocationModalOpen}
          onClose={() => {
            setIsReportLocationModalOpen(false);
            setReportCoords(null);
          }}
          initialLat={reportCoords.lat}
          initialLng={reportCoords.lng}
          initialAddress={reportAddress}
          title="새로운 흡연구역 제보"
          mode="report"
          allAreas={data}
          onConfirm={handleConfirmReportLocation}
        />
      )}

      {/* 제보 세부 내용 기입용 팝업 모달 */}
      {isReportDetailsModalOpen && reportCoords && (
        <ReportDetailsModal
          isOpen={isReportDetailsModalOpen}
          onClose={() => {
            setIsReportDetailsModalOpen(false);
            setReportCoords(null);
            setReportAddress("");
          }}
          lat={reportCoords.lat}
          lng={reportCoords.lng}
          address={reportAddress}
          onConfirm={handleConfirmReportDetails}
        />
      )}
    </div>
  );
}
