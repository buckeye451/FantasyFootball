/**
 * Shared colour bands for the two percentage metrics, so the standings and
 * head-to-head tables can't drift apart.
 */

/** Manager %: green above 92, orange 89–92, red below 89. */
export function managerClass(v: number | null): string | undefined {
  if (v == null) return undefined;
  if (v > 92) return 'val-good';
  if (v >= 89) return 'val-warn';
  return 'val-bad';
}

/**
 * Win % vs the rest of the league. In a 10-team week a score beats k of the
 * other 9 teams, so the value lands on 0, 11, 22, 33, 44, 56, 67, 78, 89, 100.
 * Top third green (78+), middle third orange (44–67), bottom third red.
 */
export function winPctClass(v: number | null): string | undefined {
  if (v == null) return undefined;
  // Band on the value as displayed: beating 7 of 9 is 77.78, which renders as
  // 78 and belongs in the top band. Comparing the raw number would put it in
  // the middle one.
  const shown = Math.round(v);
  if (shown >= 78) return 'val-good';
  if (shown >= 44) return 'val-warn';
  return 'val-bad';
}

/** Performance %: green above 100, orange 95–100, red below 95. */
export function performanceClass(v: number | null): string | undefined {
  if (v == null) return undefined;
  if (v > 100) return 'val-good';
  if (v >= 95) return 'val-warn';
  return 'val-bad';
}
