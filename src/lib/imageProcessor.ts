/**
 * 클라이언트 사이드에서 이미지를 resizing하고 WebP 포맷으로 변환하는 유틸리티
 */

/**
 * 이미지를 로드하여 가로/세로 중 큰 값이 maxDimension보다 크면 비율을 유지한 채 축소한 뒤,
 * WebP 포맷의 Blob으로 변환하여 반환합니다.
 * 
 * @param file 원본 이미지 파일
 * @param maxDimension 최대 허용 가로 또는 세로 크기 (픽셀)
 * @param quality WebP 압축 화질 (0.0 ~ 1.0)
 */
export async function resizeAndConvertToWebp(
  file: File,
  maxDimension: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      // 메모리 정리
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      // 크기 조정 계산 (비율 유지)
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      // 캔버스 생성 및 드로잉
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas 2D Context를 얻을 수 없습니다.'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // WebP로 변환
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('WebP 파일 변환에 실패했습니다.'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지 로딩 실패: ' + (err instanceof Error ? err.message : String(err))));
    };

    img.src = objectUrl;
  });
}
