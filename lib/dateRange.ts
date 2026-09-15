import { DateRange } from "./types";

export const PRESETS = [7, 14, 30, 60, 90] as const;

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function presetRange(days: number): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return { start: toISO(start), end: toISO(end), label: `Last ${days} days` };
}

export function rangeFromDates(start: string, end: string, label?: string): DateRange {
  return { start, end, label: label ?? `${start} – ${end}` };
}

export function todayRange(): DateRange {
  const d = toISO(new Date());
  return { start: d, end: d, label: "Today" };
}

export function yesterdayRange(): DateRange {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const iso = toISO(d);
  return { start: iso, end: iso, label: "Yesterday" };
}

export function lastMonthRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return { start: toISO(start), end: toISO(end), label: "Last month" };
}

export function thisMonthRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: toISO(start), end: toISO(now), label: "This month" };
}

export const DATE_PRESETS: { label: string; range: () => DateRange }[] = [
  { label: "Today", range: todayRange },
  { label: "Yesterday", range: yesterdayRange },
  { label: "Last 7 days", range: () => presetRange(7) },
  { label: "Last 14 days", range: () => presetRange(14) },
  { label: "Last 30 days", range: () => presetRange(30) },
  { label: "Last 90 days", range: () => presetRange(90) },
  { label: "This month", range: thisMonthRange },
  { label: "Last month", range: lastMonthRange },
];

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
    return toISO(d);
  });
}

export function formatDateLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
