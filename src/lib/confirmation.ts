/**
 * 흡연구역 "흡연 가능 확인" 중복 방지를 위한 localStorage 기반 헬퍼입니다.
 * 같은 브라우저에서는 흡연구역당 1회만 확인할 수 있습니다.
 */

const CONFIRMED_AREAS_KEY = "smoking_map_confirmed_areas";

function getConfirmedAreaIds(): string[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(CONFIRMED_AREAS_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 이 브라우저에서 해당 흡연구역을 이미 확인했는지 여부를 반환합니다.
 */
export function hasConfirmedArea(areaId: string): boolean {
  return getConfirmedAreaIds().includes(areaId);
}

/**
 * 해당 흡연구역을 확인 완료 상태로 저장합니다.
 */
export function markAreaConfirmed(areaId: string): void {
  if (typeof window === "undefined") return;

  const ids = getConfirmedAreaIds();
  if (!ids.includes(areaId)) {
    ids.push(areaId);
    localStorage.setItem(CONFIRMED_AREAS_KEY, JSON.stringify(ids));
  }
}
