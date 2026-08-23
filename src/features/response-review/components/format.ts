/** Format a mean for display; N/A when null. */
export function formatMean(value: number | null): string {
  return value === null ? "N/A" : value.toFixed(2);
}

/** Format a rate/percentage for display; em-dash when null. */
export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}