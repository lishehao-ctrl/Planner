export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

export function compareDates(a: Date, b: Date): number {
  return a.getTime() - b.getTime();
}

export function sortSegmentsByStart<T extends { start: Date }>(segments: readonly T[]): T[] {
  return [...segments].sort((a, b) => compareDates(a.start, b.start));
}
