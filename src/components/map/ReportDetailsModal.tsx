import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  address: string;
  onConfirm: (name: string, description: string, address: string) => Promise<void>;
}

export default function ReportDetailsModal({
  isOpen,
  onClose,
  lat,
  lng,
  address: initialAddress,
  onConfirm,
}: Props) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState(initialAddress);
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;

    setIsSaving(true);
    try {
      await onConfirm(name.trim(), description.trim(), address.trim());
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "제보 제출 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-surface rounded-3xl shadow-2xl overflow-hidden border border-foreground/5 animate-scale-up flex flex-col max-h-[90vh]">
        
        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-foreground/5 bg-background/50 shrink-0">
          <div>
            <h3 className="font-bold text-foreground text-lg">💡 흡연구역 상세 정보 제보</h3>
            <p className="text-xs text-foreground/50 mt-0.5">제보해주신 흡연구역은 관리자 승인 과정을 거쳐 등록됩니다.</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-foreground/50 hover:text-foreground p-1.5 rounded-full hover:bg-foreground/5 transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 폼 본문 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* 위치 미리보기 배지 */}
          <div className="bg-background/60 p-4 rounded-2xl border border-foreground/5 flex flex-col gap-1.5">
            <div className="text-[10px] text-foreground/45 font-bold uppercase tracking-wider">제보 좌표</div>
            <div className="text-xs text-foreground/80 font-medium flex gap-4">
              <span>Latitude (위도): <strong className="text-foreground">{lat.toFixed(6)}</strong></span>
              <span>Longitude (경도): <strong className="text-foreground">{lng.toFixed(6)}</strong></span>
            </div>
          </div>

          {/* 주소 필드 (필수) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-address" className="text-xs font-bold text-foreground/70 flex items-center gap-1">
              📍 제보 위치 주소 <span className="text-danger font-normal">*</span>
            </label>
            <input
              type="text"
              id="report-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="예: 서울특별시 마포구 백범로 35"
              required
              disabled={isSaving}
              className="w-full px-4 py-3 bg-background border border-foreground/10 rounded-2xl text-sm text-foreground focus:outline-none focus:border-primary transition-all font-medium placeholder:text-foreground/30"
            />
          </div>

          {/* 이름 필드 (필수) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-name" className="text-xs font-bold text-foreground/70 flex items-center gap-1">
              🏢 흡연구역 이름 <span className="text-danger font-normal">*</span>
            </label>
            <input
              type="text"
              id="report-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: OOO빌딩 뒤편 흡연부스"
              required
              disabled={isSaving}
              className="w-full px-4 py-3 bg-background border border-foreground/10 rounded-2xl text-sm text-foreground focus:outline-none focus:border-primary transition-all font-medium placeholder:text-foreground/30"
            />
          </div>

          {/* 설명 필드 (선택) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-description" className="text-xs font-bold text-foreground/70">
              📝 상세 설명 (선택)
            </label>
            <textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="위치를 쉽게 찾아갈 수 있는 안내나 특이 사항을 적어주세요. (예: 주차장 안쪽 비가림막 위치)"
              rows={3}
              disabled={isSaving}
              className="w-full px-4 py-3 bg-background border border-foreground/10 rounded-2xl text-sm text-foreground focus:outline-none focus:border-primary transition-all font-medium placeholder:text-foreground/30 resize-none"
            />
          </div>

          {/* 푸터 영역 - shrink-0을 더해 하단 확정 버튼 잘림 철저히 방지 */}
          <div className="flex gap-2 mt-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-3.5 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded-2xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim() || !address.trim()}
              className="flex-[2] py-3.5 bg-primary text-primary-foreground hover:brightness-105 rounded-2xl text-sm font-bold shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                  제보하는 중...
                </>
              ) : (
                "제보 완료"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
