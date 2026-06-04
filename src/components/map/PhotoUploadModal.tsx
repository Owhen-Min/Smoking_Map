"use client";

import { useState, useRef } from "react";
import exifr from "exifr";
import { SmokingArea } from "@/types/smoking";
import { resizeAndConvertToWebp } from "@/lib/imageProcessor";
import { uploadSmokingAreaImage } from "@/services/smokingArea";

interface Props {
  area: SmokingArea;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// 두 좌표 사이의 거리 계산 (Haversine 공식, 단위: m)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // 지구 반지름 (m)
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export default function PhotoUploadModal({ area, isOpen, onClose, onSuccess }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isParsingGps, setIsParsingGps] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processSelectedFile(files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    // 1. 파일 및 프리뷰 설정
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // 2. GPS 정보 추출
    setIsParsingGps(true);
    setGpsCoords(null);
    setDistance(null);
    
    try {
      // exifr로 GPS 메타데이터 파싱
      const gps = await exifr.gps(file);
      if (gps && gps.latitude && gps.longitude) {
        const { latitude, longitude } = gps;
        const d = calculateDistance(latitude, longitude, area.lat, area.lng);
        setGpsCoords({ lat: latitude, lng: longitude });
        setDistance(d);
      }
    } catch (err) {
      console.error("GPS 데이터 파싱 중 에러 발생:", err);
    } finally {
      setIsParsingGps(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        await processSelectedFile(file);
      } else {
        alert("이미지 파일만 업로드할 수 있습니다.");
      }
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // 1. WebP 변환 단계
      setUploadStatusMsg("이미지 최적화 변환 중... (WebP 변환)");
      
      // HD 변환 (가로세로 최대 1600px, 퀄리티 0.8)
      const hdBlob = await resizeAndConvertToWebp(selectedFile, 1600, 0.8);
      // SD 변환 (가로세로 최대 600px, 퀄리티 0.7)
      const sdBlob = await resizeAndConvertToWebp(selectedFile, 600, 0.7);

      // 2. Supabase Storage 업로드 및 DB 등록
      setUploadStatusMsg("Supabase 스토리지에 업로드 중...");
      const isPrimary = !area.smoking_area_images || area.smoking_area_images.length === 0;

      await uploadSmokingAreaImage(area.id, hdBlob, sdBlob, isPrimary);

      alert("사진이 성공적으로 등록되었습니다!");
      onSuccess();
      handleCloseAndReset();
    } catch (err: any) {
      console.error("업로드 에러:", err);
      alert(err.message || "사진 등록에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsUploading(false);
      setUploadStatusMsg("");
    }
  };

  const handleCloseAndReset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setGpsCoords(null);
    setDistance(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-surface border border-foreground/5 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/5">
          <h3 className="font-bold text-foreground text-lg">📸 사진 등록</h3>
          <button 
            onClick={handleCloseAndReset} 
            className="text-foreground/50 hover:text-foreground p-1 transition-colors"
            disabled={isUploading}
          >
            ✕
          </button>
        </div>

        {/* 모달 바디 */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* 흡연구역 위치 정보 표시 */}
          <div className="bg-background rounded-xl p-3 text-xs text-foreground/70 space-y-1">
            <p className="font-semibold text-foreground truncate">{area.name || "이름 없는 흡연구역"}</p>
            <p className="truncate">{area.address || "주소 정보가 없습니다."}</p>
          </div>

          {/* 파일 업로드 영역 / 이미지 프리뷰 */}
          {!previewUrl ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-foreground/15 hover:border-primary/50 rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 group bg-foreground/2 flex flex-col items-center justify-center min-h-[200px]"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={1.5} 
                stroke="currentColor" 
                className="w-10 h-10 text-foreground/45 group-hover:text-primary transition-colors mb-3"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="text-sm font-semibold text-foreground">사진 파일을 끌어다 놓거나 클릭하세요</p>
              <p className="text-xs text-foreground/50 mt-1">JPEG, PNG, WEBP 등 지원</p>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden" 
              />
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-foreground/5 bg-foreground/5 flex items-center justify-center min-h-[200px] max-h-[280px]">
              <img 
                src={previewUrl} 
                alt="미리보기" 
                className="w-full h-full max-h-[280px] object-contain"
              />
              {!isUploading && (
                <button 
                  onClick={() => {
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setGpsCoords(null);
                    setDistance(null);
                  }}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* GPS 정보 파싱 결과 */}
          {previewUrl && (
            <div className="space-y-2">
              {isParsingGps ? (
                <div className="bg-foreground/5 rounded-xl p-3 flex items-center gap-2 text-xs text-foreground/70">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span>사진에서 위치 정보(GPS) 파싱 중...</span>
                </div>
              ) : distance !== null && gpsCoords ? (
                distance <= 100 ? (
                  <div className="bg-accuracy-high/10 text-accuracy-high border border-accuracy-high/20 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex items-center gap-1 font-semibold">
                      <span>🟢 위치 정보 확인됨</span>
                    </div>
                    <p>사진 촬영 위치가 흡연구역 인근(약 {Math.round(distance)}m 거리)으로 확인되었습니다.</p>
                  </div>
                ) : (
                  <div className="bg-accuracy-medium/10 text-accuracy-medium border border-accuracy-medium/20 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex items-center gap-1 font-semibold">
                      <span>⚠️ 촬영 위치 불일치 가능성</span>
                    </div>
                    <p>사진 촬영 위치가 이 흡연구역과 다소 멉니다 (약 {Math.round(distance)}m 거리).</p>
                    <p className="opacity-80">올바른 위치의 사진이 맞는지 한 번 더 확인해 주세요.</p>
                  </div>
                )
              ) : (
                <div className="bg-foreground/5 text-foreground/60 border border-foreground/5 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex items-center gap-1 font-medium">
                    <span>📍 위치 정보 없음</span>
                  </div>
                  <p>사진에 GPS 정보가 없습니다. 스크린샷이나 위치 정보 수집이 비활성화된 카메라는 위치 확인이 제한될 수 있습니다.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="px-6 py-4 border-t border-foreground/5 flex gap-3">
          <button
            onClick={handleCloseAndReset}
            className="flex-1 py-3 bg-foreground/5 hover:bg-foreground/10 text-foreground font-semibold rounded-xl text-sm transition-colors"
            disabled={isUploading}
          >
            취소
          </button>
          <button
            onClick={handleUploadSubmit}
            className="flex-1 py-3 bg-primary hover:opacity-95 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs truncate max-w-[120px]">{uploadStatusMsg ? "업로드 중..." : "변환 중..."}</span>
              </>
            ) : (
              "등록하기"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
