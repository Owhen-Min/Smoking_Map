export const REMOVAL_REASONS = {
  closed: '폐쇄되었어요',
  prohibited: '흡연이 금지된 장소예요',
  duplicate: '중복 등록된 장소예요',
  incorrect: '흡연구역이 아닌 장소예요',
  other: '기타',
} as const;

export function isRemovalReason(value: unknown): value is keyof typeof REMOVAL_REASONS {
  return typeof value === 'string' && Object.hasOwn(REMOVAL_REASONS, value);
}
