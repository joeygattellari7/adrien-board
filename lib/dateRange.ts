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

export type CompareOption = "none" | "previous_period" | "previous_quarter" | "previous_year";

export const COMPARE_OPTIONS: { value: CompareOption; label: string }[] = [
  { value: "none", label: "None" },
  { value: "previous_period", label: "Previous period" },
  { value: "previous_quarter", label: "Previous quarter" },
  { value: "previous_year", label: "Previous year" },
];

export function compareRangeFor(range: DateRange, option: CompareOption): DateRange | null {
  if (option === "none") return null;

  if (option === "previous_period") {
    const n = daysBetween(range);
    const end = new Date(range.start + "T00:00:00");
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setDate(end.getDate() - (n - 1));
    return { start: toISO(start), end: toISO(end), label: "Previous period" };
  }

  const monthsBack = option === "previous_quarter" ? 3 : 12;
  const start = new Date(range.start + "T00:00:00");
  const end = new Date(range.end + "T00:00:00");
  start.setMonth(start.getMonth() - monthsBack);
  end.setMonth(end.getMonth() - monthsBack);
  return { start: toISO(start), end: toISO(end), label: option === "previous_quarter" ? "Previous quarter" : "Previous year" };
}

export function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function formatDateLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
