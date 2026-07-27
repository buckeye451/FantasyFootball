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

/** Performance %: green above 100, orange 95–100, red below 95. */
export function performanceClass(v: number | null): string | undefined {
  if (v == null) return undefined;
  if (v > 100) return 'val-good';
  if (v >= 95) return 'val-warn';
  return 'val-bad';
}
