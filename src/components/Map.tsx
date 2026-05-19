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
  const markersRef = useRef<any[]>([]); // 마커 관리용 Ref 추가

  const { data } = useSmokingAreas();
  const [isLoaded, setIsLoaded] = useState(false);

  // 🔥 핵심: 선택된 마커 정보를 담을 상태
  const [selectedArea, setSelectedArea] = useState<SmokingArea | null>(null);

  // useEffect(() => {
  //   const existingScript = document.getElementById("kakao-map-script");
  //   if (existingScript) {
  //     setIsLoaded(true);
  //     return;
  //   }
  //   const script = document.createElement("script");
  //   script.id = "kakao-map-script";
  //   script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_KEY}&autoload=false`;
  //   script.async = true;
  //   script.onload = () => setIsLoaded(true);
  //   document.head.appendChild(script);
  // }, []);

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
        navigator.geolocation.getCurrentPosition((pos) => {
          const moveLatLng = new window.kakao.maps.LatLng(
            pos.coords.latitude,
            pos.coords.longitude,
          );
          map.setCenter(moveLatLng);
        });
      }
    });
  }, [isLoaded]);

  // 🔥 3. 마커 생성 및 클릭 이벤트 등록
  useEffect(() => {
    if (!mapInstance.current || !data) return;

    // 기존 마커 제거 (데이터 업데이트 시 중복 방지)
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    data.forEach((item: SmokingArea) => {
      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(item.lat, item.lng),
        map: mapInstance.current,
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
