function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, current) => sum + current, 0);
  return roundToTwo(total / values.length);
}
