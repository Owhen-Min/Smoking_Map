import { useState, useRef, useEffect } from "react";

interface UseMapGeolocationProps {
  mapInstance: React.MutableRefObject<any>;
}

export function useMapGeolocation({ mapInstance }: UseMapGeolocationProps) {
  const [isLocating, setIsLocating] = useState(false);
  const userMarkerRef = useRef<any>(null); // 내 위치 마커 Ref
  const lastUserLocationRef = useRef<{ lat: number; lng: number } | null>(null); // 내 위치 캐싱용 Ref
  const watchIdRef = useRef<number | null>(null); // 내 위치 실시간 트래킹 ID Ref

  // 내 위치 마커 생성 및 업데이트 함수
  const updateUserMarker = (lat: number, lng: number) => {
    if (!mapInstance.current || !window.kakao || !window.kakao.maps) return;

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

  // 백그라운드 위치 추적 및 캐싱 개시 함수
  const startTracking = () => {
    if (!navigator.geolocation || !mapInstance.current) return;

    setIsLocating(true);
    // 초기 1회 신속 측위
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        lastUserLocationRef.current = { lat, lng };

        const moveLatLng = new window.kakao.maps.LatLng(lat, lng);
        mapInstance.current.setCenter(moveLatLng);
        updateUserMarker(lat, lng);
        setIsLocating(false);
      },
      (err) => {
        console.error(err);
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
    );

    // 기존 watch가 있다면 정리 후 재시작
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

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
  };

  // 컴포넌트 언마운트 시 트래킹 정리
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    isLocating,
    handleGoToMyLocation,
    updateUserMarker,
    startTracking,
  };
}
