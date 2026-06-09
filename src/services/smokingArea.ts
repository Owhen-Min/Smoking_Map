import { SmokingArea } from '@/types/smoking';
import { supabase } from '@/lib/supabase';

export async function fetchSmokingAreas(): Promise<SmokingArea[]> {
  const response = await fetch('/api/smoking-areas');
  
  if (!response.ok) {
    throw new Error('Failed to fetch smoking areas');
  }

  const data = await response.json();
  return data;
}

export async function updateSmokingAreaLocation(id: string, lat: number, lng: number, address?: string): Promise<SmokingArea> {
  const response = await fetch('/api/smoking-areas', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, lat, lng, address }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update smoking area location');
  }

  const data = await response.json();
  return data;
}

export async function createSmokingAreaReport(report: {
  name: string;
  lat: number;
  lng: number;
  address: string;
  description?: string;
}): Promise<SmokingArea> {
  const response = await fetch('/api/smoking-areas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(report),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to submit smoking area report');
  }

  const data = await response.json();
  return data;
}

export async function confirmSmokingArea(id: string): Promise<SmokingArea> {
  const response = await fetch('/api/smoking-areas/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to confirm smoking area');
  }

  const data = await response.json();
  return data;
}

export async function uploadSmokingAreaImage(
  areaId: string,
  hdBlob: Blob,
  sdBlob: Blob,
  isPrimary: boolean
): Promise<any> {
  const imageId = typeof window !== 'undefined' && window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  const hdPath = `photos/${areaId}/${imageId}_hd.webp`;
  const sdPath = `photos/${areaId}/${imageId}_sd.webp`;

  // 1. HD 업로드
  const { error: hdError } = await supabase.storage
    .from('smoking-areas')
    .upload(hdPath, hdBlob, {
      contentType: 'image/webp',
      cacheControl: '3600',
    });

  if (hdError) {
    throw new Error(`HD 이미지 업로드 실패: ${hdError.message}`);
  }

  // 2. SD 업로드
  const { error: sdError } = await supabase.storage
    .from('smoking-areas')
    .upload(sdPath, sdBlob, {
      contentType: 'image/webp',
      cacheControl: '3600',
    });

  if (sdError) {
    // 롤백 (성공했던 HD 이미지 삭제)
    await supabase.storage.from('smoking-areas').remove([hdPath]);
    throw new Error(`SD 이미지 업로드 실패: ${sdError.message}`);
  }

  // 3. HD 및 SD 이미지의 Public URL 획득
  const { data: { publicUrl: hdUrl } } = supabase.storage
    .from('smoking-areas')
    .getPublicUrl(hdPath);

  const { data: { publicUrl: sdUrl } } = supabase.storage
    .from('smoking-areas')
    .getPublicUrl(sdPath);

  // 4. API 라우트를 통해 안전하게 DB에 데이터 삽입
  const response = await fetch('/api/smoking-areas/images', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      smoking_area_id: areaId,
      image_url_hd: hdUrl,
      image_url_sd: sdUrl,
      is_primary: isPrimary,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // 롤백 (업로드했던 이미지 삭제)
    await supabase.storage.from('smoking-areas').remove([hdPath, sdPath]);
    throw new Error(errorData.error || 'DB 이미지 정보 등록에 실패했습니다.');
  }

  const data = await response.json();

  return data;
}

