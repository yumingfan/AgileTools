/** Planning Poker 規則（純函式，便於單元測試） */

export const FIB_NUMERIC = [0, 1, 2, 3, 5, 8, 13, 21] as const;

export const CARD_STRINGS = [
  '0',
  '1',
  '2',
  '3',
  '5',
  '8',
  '13',
  '21',
  '?',
] as const;

export type CardString = (typeof CARD_STRINGS)[number];

/** 六組「三連續」Fibonacci 區間（依題意使用離散集合） */
const TRIPLETS: ReadonlyArray<readonly number[]> = [
  [0, 1, 2],
  [1, 2, 3],
  [2, 3, 5],
  [3, 5, 8],
  [5, 8, 13],
  [8, 13, 21],
];

export function isAllowedCard(raw: string): boolean {
  return (CARD_STRINGS as readonly string[]).includes(raw);
}

export function parseVote(raw: string): number | '?' | null {
  if (raw === '?') return '?';
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || !FIB_NUMERIC.includes(n as (typeof FIB_NUMERIC)[number])) {
    return null;
  }
  return n;
}

export function allNumericInSameTriplet(nums: number[]): boolean {
  if (nums.length === 0) return false;
  return TRIPLETS.some((t) => {
    const set = new Set(t);
    return nums.every((n) => set.has(n));
  });
}

export function average(nums: number[]): number {
  if (nums.length === 0) return NaN;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** 平均顯示與儲存：四捨五入至個位數（整數） */
export function roundAverageInt(n: number): number {
  return Math.round(n);
}

export function formatAverageInt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return String(roundAverageInt(n));
}

export function findMatchingTriplet(nums: number[]): readonly number[] | undefined {
  if (nums.length === 0) return undefined;
  return TRIPLETS.find((t) => {
    const set = new Set(t);
    return nums.every((n) => set.has(n));
  });
}

/** Round 1/2 成功：產生平均（整數）與可讀公式 */
export function buildSuccessAverageFormula(nums: number[]): {
  average: number;
  formula: string;
  matchedTriplet: readonly number[];
} {
  const triplet = findMatchingTriplet(nums);
  if (!triplet) {
    throw new Error('votes not in same triplet');
  }
  const avg = roundAverageInt(average(nums));
  const sumExpr = nums.join(' + ');
  const formula =
    `判定：全部落在 Fibonacci 區間 {${triplet.join(', ')}}\n` +
    `平均 = (${sumExpr}) ÷ ${nums.length} = ${formatAverageInt(avg)}`;
  return { average: avg, formula, matchedTriplet: triplet };
}

/** Round 3 收斂：產生平均（整數）與可讀公式 */
export function buildRound3ConvergedFormula(
  votes: string[],
): { average: number; formula: string; remaining: number[] } | null {
  const outcome = evaluateRound3(votes);
  if (outcome.kind !== 'converged') return null;
  const parsed = votes.map(parseVote);
  const nums = parsed as number[];
  const mn = Math.min(...nums);
  const mx = Math.max(...nums);
  const avg = roundAverageInt(outcome.average);
  const remaining = outcome.remaining;
  const sumExpr = remaining.join(' + ');
  const formula =
    `移除所有最低票（${mn}）與最高票（${mx}）\n` +
    `剩餘：${remaining.join(', ')}\n` +
    `平均 = (${sumExpr}) ÷ ${remaining.length} = ${formatAverageInt(avg)}`;
  return { average: avg, formula, remaining };
}

/** Round 1/2：含 `?` → 無法估算；否則三連續成功則平均，否則失敗（最高／最低提醒） */
export type Round12Outcome =
  | { kind: 'cannot_estimate' }
  | { kind: 'success'; average: number }
  | { kind: 'failure'; min: number; max: number };

export function evaluateRound12(votes: string[]): Round12Outcome {
  const parsed = votes.map(parseVote);
  if (parsed.some((v) => v === null)) {
    throw new Error('invalid vote in evaluateRound12');
  }
  if (parsed.some((v) => v === '?')) {
    return { kind: 'cannot_estimate' };
  }
  const nums = parsed as number[];
  if (allNumericInSameTriplet(nums)) {
    return { kind: 'success', average: average(nums) };
  }
  return {
    kind: 'failure',
    min: Math.min(...nums),
    max: Math.max(...nums),
  };
}

/** Round 3：未出現 `?` 時移除所有全域 min／max 後取平均；無剩餘 → 無法估算 */
export type Round3Outcome =
  | { kind: 'cannot_estimate' }
  | { kind: 'converged'; average: number; remaining: number[] };

export function evaluateRound3(votes: string[]): Round3Outcome {
  const parsed = votes.map(parseVote);
  if (parsed.some((v) => v === null)) {
    throw new Error('invalid vote in evaluateRound3');
  }
  if (parsed.some((v) => v === '?')) {
    return { kind: 'cannot_estimate' };
  }
  const nums = [...(parsed as number[])];
  if (nums.length === 0) {
    return { kind: 'cannot_estimate' };
  }
  const mn = Math.min(...nums);
  const mx = Math.max(...nums);
  const remaining = nums.filter((n) => n !== mn && n !== mx);
  if (remaining.length === 0) {
    return { kind: 'cannot_estimate' };
  }
  return { kind: 'converged', average: average(remaining), remaining };
}
