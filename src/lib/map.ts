/**
 * Kakao Map 관련 헬퍼 유틸리티 함수 모음
 */

/**
 * 흡연구역의 정확도(accuracy)에 따른 커스텀 마커 이미지를 반환합니다.
 */
export const getMarkerImage = (accuracy: "high" | "medium" | "low") => {
  if (typeof window === "undefined" || !window.kakao || !window.kakao.maps) {
    return null;
  }

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

/**
 * 위도와 경도를 받아 카카오맵 역지오코딩(Reverse Geocoding)을 통해 주소를 반환합니다.
 * 이 함수는 기존 흡연장의 위치 수정 시와 신규 흡연장 제보 시 모두 공통으로 활용됩니다.
 */
export const getAddressFromCoords = (lat: number, lng: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.kakao || !window.kakao.maps) {
      reject(new Error("Kakao Maps SDK가 로드되지 않았습니다."));
      return;
    }

    if (!window.kakao.maps.services || !window.kakao.maps.services.Geocoder) {
      reject(new Error("Kakao Maps Services 라이브러리가 로드되지 않았습니다. Script 태그에 &libraries=services가 추가되어 있는지 확인하세요."));
      return;
    }

    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.coord2Address(lng, lat, (result: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const roadAddress = result[0].road_address?.address_name;
        const jibunAddress = result[0].address?.address_name;
        resolve(roadAddress || jibunAddress || "주소를 찾을 수 없는 위치입니다.");
      } else {
        reject(new Error("주소 변환에 실패했습니다."));
      }
    });
  });
};

