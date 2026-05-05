'use client';  // Next.js면 필요

import { useEffect, useRef } from 'react';

export default function KakaoMap() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  navigator.geolocation.getCurrentPosition(
  (position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    new window.kakao.maps.Map(mapRef.current, {
      center: new window.kakao.maps.LatLng(lat, lng),
      level: 2,
    });
  },
  () => {
    // 실패 시 서울로 fallback
    new window.kakao.maps.Map(mapRef.current, {
      center: new window.kakao.maps.LatLng(37.5665, 126.9780),
      level: 5,
    });
  }
);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_KEY}&autoload=false`;
    script.async = true;

    script.onload = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
      
          new window.kakao.maps.Map(mapRef.current, {
            center: new window.kakao.maps.LatLng(lat, lng),
            level: 2,
          });
        },
        () => {
          // 실패 시 서울로 fallback
          new window.kakao.maps.Map(mapRef.current, {
            center: new window.kakao.maps.LatLng(37.5665, 126.9780),
            level: 5,
          });
        }
      );
    };

    document.head.appendChild(script);
  }, []);

  return <div ref={mapRef} style={{ width: '60vw', height: '90vh' }} />;
}