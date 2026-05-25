"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useSmokingAreas } from "@/hooks/useSmokingAreas";
import { SmokingArea } from "@/types/smoking";
import AreaDetailCard from "@/components/map/AreaDetailCard";
import DarkModeToggleButton from "@/components/map/DarkModeToggleButton";

export default function KakaoMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]); // 마커 관리용 Ref
  const userMarkerRef = useRef<any>(null); // 내 위치 마커 Ref
  const lastUserLocationRef = useRef<{ lat: number; lng: number } | null>(null); // 내 위치 캐싱용 Ref
  const watchIdRef = useRef<number | null>(null); // 내 위치 실시간 트래킹 ID Ref

  const { data } = useSmokingAreas();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLocating, setIsLocating] = useState(false); // 위치 조회 중 상태

  // 🔥 핵심: 선택된 마커 정보를 담을 상태
  const [selectedArea, setSelectedArea] = useState<SmokingArea | null>(null);

  // 내 위치 마커 생성 및 업데이트 함수
  const updateUserMarker = (lat: number, lng: number) => {
    if (!mapInstance.current || !window.kakao) return;

    const position = new window.kakao.maps.LatLng(lat, lng);
    const imageSrc = "/pins/pin-blue.svg";
    const imageSize = new window.kakao.maps.Size(36, 46);
    const imageOption = { offset: new window.kakao.maps.Point(18, 44) };
    const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(position);
      userMarkerRef.current.setMap(mapInstance.current);
    } else {
      const marker = new window.kakao.maps.Marker({
        position,
        image: markerImage,
        map: mapInstance.current,
      });
      userMarkerRef.current = marker;
    }
  };

  // 내 위치로 지도 중심 이동 버튼 핸들러 (캐싱 활용으로 초고속 반응)
  const handleGoToMyLocation = () => {
    // 1. 이미 캐시된 최신 위치가 있다면 대기 시간 없이 즉시 화면 이동!
    if (lastUserLocationRef.current && mapInstance.current) {
      const { lat, lng } = lastUserLocationRef.current;
      const moveLatLng = new window.kakao.maps.LatLng(lat, lng);
      mapInstance.current.panTo(moveLatLng);
      updateUserMarker(lat, lng);
      return;
    }

    // 2. 캐시된 위치가 없거나 아직 조회 전일 경우에만 fallback으로 직접 조회
    if (!navigator.geolocation) {
      alert("이 브라우저에서는 위치 서비스를 지원하지 않습니다.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        lastUserLocationRef.current = { lat, lng };

        const moveLatLng = new window.kakao.maps.LatLng(lat, lng);
        if (mapInstance.current) {
          mapInstance.current.panTo(moveLatLng);
        }
        updateUserMarker(lat, lng);
        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting geolocation:", error);
        alert("위치 정보를 가져올 수 없습니다. 권한을 확인해주세요.");
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
    );
  };

  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current) return;

    window.kakao.maps.load(() => {
      const options = {
        center: new window.kakao.maps.LatLng(37.5665, 126.978),
        level: 3,
      };
      const map = new window.kakao.maps.Map(mapContainerRef.current, options);
      mapInstance.current = map;

      if (navigator.geolocation) {
        setIsLocating(true);
        // 초기 1회 신속 측위
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            lastUserLocationRef.current = { lat, lng };

            const moveLatLng = new window.kakao.maps.LatLng(lat, lng);
            map.setCenter(moveLatLng);
            updateUserMarker(lat, lng);
            setIsLocating(false);
          },
          (err) => {
            console.error(err);
            setIsLocating(false);
          },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
        );

        // 백그라운드 실시간 위치 트래킹 개시 (이동 시 캐시 갱신 및 마커 연동)
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            lastUserLocationRef.current = { lat, lng };
            updateUserMarker(lat, lng);
          },
          (err) => {
            console.error("watchPosition error:", err);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
        );
      }
    });

    // 언마운트 시 실시간 트래킹 리소스 해제
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isLoaded]);

  // 🔥 3. 마커 생성 및 클릭 이벤트 등록
  useEffect(() => {
    if (!mapInstance.current || !data) return;

    // 기존 마커 제거 (데이터 업데이트 시 중복 방지)
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // 정확도(accuracy)에 따른 맞춤형 핀 이미지 반환 함수
    const getMarkerImage = (accuracy: "high" | "medium" | "low") => {
      let imageSrc = "/pins/pin-green.svg"; // 기본: 높은 정확도 (초록색)
      if (accuracy === "low") {
        imageSrc = "/pins/pin-red.svg"; // 낮은 정확도 (빨간색)
      } else if (accuracy === "medium") {
        imageSrc = "/pins/pin-yellow.svg"; // 보통 정확도 (노란색)
      }

      const imageSize = new window.kakao.maps.Size(36, 46);
      const imageOption = { offset: new window.kakao.maps.Point(18, 44) };
      return new window.kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);
    };

    data.forEach((item: SmokingArea) => {
      const markerImage = getMarkerImage(item.accuracy);
      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(item.lat, item.lng),
        map: mapInstance.current,
        image: markerImage,
      });

      // 클릭 핸들러 등록
      window.kakao.maps.event.addListener(marker, "click", () => {
        setSelectedArea(item); // 클릭 시 해당 데이터를 상태에 저장
        mapInstance.current.panTo(marker.getPosition()); // 해당 위치로 부드럽게 이동
      });

      markersRef.current.push(marker);
    });
  }, [data]);

  return (
    <div className="w-full absolute right-0 top-0">
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_KEY}&autoload=false`}
        onLoad={() => setIsLoaded(true)} // 스크립트 로드 완료 시 상태 변경
        strategy="afterInteractive" // 인터랙티브한 시점에 로드
      />
      <div
        ref={mapContainerRef}
        style={{ width: "100%", height: "100dvh" }}
        className="kakao-map-container"
      />

      <DarkModeToggleButton />

      {/* 내 위치로 이동 버튼 */}
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

      {/* 상세 정보 오버레이 */}
      {selectedArea && (
        <AreaDetailCard
          area={selectedArea}
          onClose={() => setSelectedArea(null)}
        />
      )}
    </div>
  );
}
