/**
 * 제보 도배(스팸) 방지를 위한 클라이언트 측 로컬 메모리(localStorage) 기반의 레이트 리밋 헬퍼입니다.
 * 하루에 최대 5회까지만 제보할 수 있도록 제한합니다.
 */

const LIMIT_KEY = "smoking_map_report_limit";
export const MAX_REPORTS_PER_DAY = 5;

interface ReportLimitData {
  date: string; // YYYY-MM-DD
  count: number;
}

/**
 * 오늘 기준 남은 제보 횟수와 제보 가능 여부를 반환합니다.
 */
export function checkReportLimit(): { allowed: boolean; remaining: number; count: number } {
  if (typeof window === "undefined") {
    return { allowed: MAX_REPORTS_PER_DAY > 0, remaining: MAX_REPORTS_PER_DAY, count: 0 };
  }

  // 로컬 시간 기준으로 오늘 날짜 (YYYY-MM-DD) 구하기
  const today = new Date().toLocaleDateString("sv-SE"); // sv-SE 포맷은 항상 YYYY-MM-DD를 반환합니다.
  const stored = localStorage.getItem(LIMIT_KEY);

  if (!stored) {
    return { allowed: MAX_REPORTS_PER_DAY > 0, remaining: MAX_REPORTS_PER_DAY, count: 0 };
  }

  try {
    const data: ReportLimitData = JSON.parse(stored);
    if (data.date !== today) {
      // 날짜가 다르면 새로운 하루이므로 초기화 상태를 반환
      return { allowed: MAX_REPORTS_PER_DAY > 0, remaining: MAX_REPORTS_PER_DAY, count: 0 };
    }

    return {
      allowed: data.count < MAX_REPORTS_PER_DAY,
      remaining: Math.max(0, MAX_REPORTS_PER_DAY - data.count),
      count: data.count,
    };
  } catch (e) {
    // 파싱 오류 발생 시 리셋
    return { allowed: MAX_REPORTS_PER_DAY > 0, remaining: MAX_REPORTS_PER_DAY, count: 0 };
  }
}

/**
 * 제보가 성공했을 때 제보 횟수를 1 증가시키고 저장합니다.
 */
export function incrementReportCount(): void {
  if (typeof window === "undefined") return;

  const today = new Date().toLocaleDateString("sv-SE");
  const stored = localStorage.getItem(LIMIT_KEY);
  let count = 1;

  if (stored) {
    try {
      const data: ReportLimitData = JSON.parse(stored);
      if (data.date === today) {
        count = data.count + 1;
      }
    } catch (e) {
      // 파싱 실패 시 초기값 1로 세팅
    }
  }

  const newData: ReportLimitData = { date: today, count };
  localStorage.setItem(LIMIT_KEY, JSON.stringify(newData));
}
