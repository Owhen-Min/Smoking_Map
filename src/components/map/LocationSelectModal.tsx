import { useEffect, useRef, useState } from "react";
import { getAddressFromCoords, getMarkerImage } from "@/lib/map";
import { SmokingArea } from "@/types/smoking";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialLat: number;
  initialLng: number;
  initialAddress: string;
  title: string;
  mode: "report" | "edit";
  allAreas?: SmokingArea[];
  editingAreaAccuracy?: "high" | "medium" | "low";
  onConfirm: (lat: number, lng: number, address: string) => Promise<void>;
}

export default function LocationSelectModal({
  isOpen,
  onClose,
  initialLat,
  initialLng,
  initialAddress,
  title,
  mode,
  allAreas,
  editingAreaAccuracy,
  onConfirm,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);

  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [address, setAddress] = useState(initialAddress);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // 모달 상태가 완전히 업데이트되고 DOM이 잡힌 후 지도 초기화
    const timer = setTimeout(() => {
      if (!mapContainerRef.current || !window.kakao || !window.kakao.maps) return;

      window.kakao.maps.load(() => {
        const options = {
          center: new window.kakao.maps.LatLng(initialLat, initialLng),
          level: 3,
        };
        const map = new window.kakao.maps.Map(mapContainerRef.current, options);
        mapInstance.current = map;

        // 마커 노출 제어
        if (mode === "edit") {
          // 수정 시: 수정하려는 흡연장 기존 위치 마커만 단일 노출
          const markerImage = getMarkerImage(editingAreaAccuracy || "high");
          if (markerImage) {
            new window.kakao.maps.Marker({
              position: new window.kakao.maps.LatLng(initialLat, initialLng),
              map: map,
              image: markerImage,
            });
          }
        } else if (mode === "report" && allAreas) {
          // 제보 시: 모든 기존 흡연장 위치 노출
          allAreas.forEach((area) => {
            const markerImage = getMarkerImage(area.accuracy);
            if (markerImage) {
              new window.kakao.maps.Marker({
                position: new window.kakao.maps.LatLng(area.lat, area.lng),
                map: map,
                image: markerImage,
              });
            }
          });
        }

        // 드래그 및 지도가 멈췄을 때 감지하여 주소 변환
        const handleMapIdle = async () => {
          const center = map.getCenter();
          const currentLat = center.getLat();
          const currentLng = center.getLng();
          setLat(currentLat);
          setLng(currentLng);

          try {
            const resolvedAddr = await getAddressFromCoords(currentLat, currentLng);
            setAddress(resolvedAddr);
          } catch (err) {
            console.error("주소 변환 실패:", err);
            setAddress("주소를 불러올 수 없는 위치입니다.");
          }
        };

        window.kakao.maps.event.addListener(map, "idle", handleMapIdle);
      });
    }, 150);

    return () => {
      clearTimeout(timer);
      mapInstance.current = null;
    };
  }, [isOpen, initialLat, initialLng, mode, allAreas, editingAreaAccuracy]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await onConfirm(lat, lng, address);
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "위치 설정 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-surface rounded-3xl shadow-2xl overflow-hidden border border-foreground/5 animate-scale-up flex flex-col max-h-[90vh]">
        {/* 헤더 - shrink-0을 더해 상단 고정 보장 */}
        <div className="flex items-center justify-between p-5 border-b border-foreground/5 bg-background/50 shrink-0">
          <div>
            <h3 className="font-bold text-foreground text-lg">{title}</h3>
            <p className="text-xs text-foreground/50 mt-0.5">지도를 드래그하여 원하는 지점을 핀 중앙에 맞춰주세요.</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-foreground/50 hover:text-foreground p-1.5 rounded-full hover:bg-foreground/5 transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 지도 영역 - 모바일 및 저해상도 기기에서도 하단 버튼이 안 잘리도록 반응형 높이(h-[320px]) 고정 */}
        <div className="relative w-full h-[320px] bg-foreground/5 shrink-0">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* 중앙 고정 핀 (말풍선 포함) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-20 pointer-events-none mb-[23px] flex flex-col items-center select-none active:scale-95 transition-all duration-300">
            <div className="bg-foreground text-background text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-md mb-2 relative flex items-center whitespace-nowrap animate-bounce">
              {mode === "report" ? "이 위치에 제보" : "이 위치로 수정"}
              <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-1.5 h-1.5 bg-foreground rotate-45" />
            </div>
            <img
              src="/pins/pin-red.svg"
              className="w-8 h-[40px] filter drop-shadow-md"
              alt="선택 핀"
            />
          </div>
        </div>

        {/* 푸터 영역 - shrink-0을 더해 하단 확정 버튼 및 주소 영역 잘림 철저히 방지 */}
        <div className="p-5 border-t border-foreground/5 bg-background/50 flex flex-col gap-4 shrink-0">
          <div className="bg-surface p-4 rounded-2xl border border-foreground/5 flex items-center gap-3">
            <span className="text-xl">📍</span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-foreground/45 font-bold uppercase tracking-wider">
                현재 선택된 주소
              </div>
              <div className="text-sm text-foreground font-semibold truncate mt-0.5">
                {address || "주소를 확인하는 중입니다..."}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-3.5 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded-2xl text-sm font-bold transition-all cursor-pointer"
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSaving || !address}
              className="flex-[2] py-3.5 bg-primary text-primary-foreground hover:brightness-105 rounded-2xl text-sm font-bold shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                  저장 중...
                </>
              ) : (
                "위치 설정 완료"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
