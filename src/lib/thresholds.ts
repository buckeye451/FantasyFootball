/**
 * Shared colour bands for the percentage metrics, so every table agrees.
 *
 * Each band compares the value as *displayed*, not the raw number: a manager
 * score of 88.95 renders as "89.0%", and colouring it red while the cell reads
 * 89 would look like a bug. The percentages below are all shown to one decimal;
 * win % vs the league is shown whole.
 */

const shown1 = (v: number) => Math.round(v * 10) / 10;

/** Manager %: green above 92, orange 89–92, red below 89. */
export function managerClass(v: number | null): string | undefined {
  if (v == null) return undefined;
  const x = shown1(v);
  if (x > 92) return 'val-good';
  if (x >= 89) return 'val-warn';
  return 'val-bad';
}

/**
 * Win % vs the rest of the league. In a 10-team week a score beats k of the
 * other 9 teams, so the value lands on 0, 11, 22, 33, 44, 56, 67, 78, 89, 100.
 * Top third green (78+), middle third orange (44–67), bottom third red.
 */
export function winPctClass(v: number | null): string | undefined {
  if (v == null) return undefined;
  const x = Math.round(v); // shown whole
  if (x >= 78) return 'val-good';
  if (x >= 44) return 'val-warn';
  return 'val-bad';
}

/** Career win %: green at 55 and above, orange 45–55, red at 45 and below. */
export function winRateClass(v: number | null): string | undefined {
  if (v == null) return undefined;
  const x = shown1(v);
  if (x >= 55) return 'val-good';
  if (x > 45) return 'val-warn';
  return 'val-bad';
}

/** Performance %: green above 100, orange 95–100, red below 95. */
export function performanceClass(v: number | null): string | undefined {
  if (v == null) return undefined;
  const x = shown1(v);
  if (x > 100) return 'val-good';
  if (x >= 95) return 'val-warn';
  return 'val-bad';
}
