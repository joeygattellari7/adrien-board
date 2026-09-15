import { DateRange } from "./types";

export const PRESETS = [7, 14, 30, 60, 90] as const;

export function presetRange(days: number): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: `Last ${days} days`,
  };
}

export function daysBetween(range: DateRange): number {
  const start = new Date(range.start);
  const end = new Date(range.end);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

export function dateList(range: DateRange): string[] {
  const n = daysBetween(range);
  const start = new Date(range.start);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}
