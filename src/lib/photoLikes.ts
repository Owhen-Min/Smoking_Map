/**
 * 흡연구역 사진 "좋아요" 중복 방지를 위한 localStorage 기반 헬퍼입니다.
 * 같은 브라우저에서는 사진당 1회만 좋아요를 누를 수 있습니다.
 */

const LIKED_IMAGES_KEY = "smoking_map_liked_images";

/**
 * 이 브라우저에서 좋아요를 누른 사진 id 목록을 반환합니다.
 */
export function getLikedImageIds(): string[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(LIKED_IMAGES_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 이 브라우저에서 해당 사진에 이미 좋아요를 눌렀는지 여부를 반환합니다.
 */
export function hasLikedImage(imageId: string): boolean {
  return getLikedImageIds().includes(imageId);
}

/**
 * 해당 사진을 좋아요 완료 상태로 저장합니다.
 */
export function markImageLiked(imageId: string): void {
  if (typeof window === "undefined") return;

  const ids = getLikedImageIds();
  if (!ids.includes(imageId)) {
    ids.push(imageId);
    localStorage.setItem(LIKED_IMAGES_KEY, JSON.stringify(ids));
  }
}
