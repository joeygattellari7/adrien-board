"use client";

import { useEffect, useRef, useState } from "react";
import { DATE_PRESETS, formatDateLabel, rangeFromDates } from "@/lib/dateRange";
import { DateRange } from "@/lib/types";

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function isBetween(iso: string, a: string, b: string): boolean {
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return iso >= lo && iso <= hi;
}

function MonthGrid({
  month,
  selStart,
  selEnd,
  hoverEnd,
  onPick,
  onHover,
}: {
  month: Date;
  selStart: string | null;
  selEnd: string | null;
  hoverEnd: string | null;
  onPick: (iso: string) => void;
  onHover: (iso: string | null) => void;
}) {
  const first = startOfMonth(month);
  const firstWeekday = first.getDay();
  const total = daysInMonth(month);
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, (): string | null => null),
    ...Array.from({ length: total }, (_, i) => toISO(new Date(month.getFullYear(), month.getMonth(), i + 1))),
  ];

  const rangeEnd = hoverEnd ?? selEnd;

  return (
    <div>
      <div className="text-center text-sm font-medium mb-2">
        {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
      </div>
      <div className="grid grid-cols-7 text-xs text-black/40 dark:text-white/40 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((iso, i) => {
          if (!iso) return <div key={i} />;
          const inRange = selStart && rangeEnd ? isBetween(iso, selStart, rangeEnd) : false;
          const isEdge = iso === selStart || iso === selEnd;
          return (
            <button
              key={iso}
              type="button"
              onMouseEnter={() => onHover(iso)}
              onClick={() => onPick(iso)}
              className={`h-8 w-8 mx-auto text-sm rounded-md transition flex items-center justify-center ${
                isEdge
                  ? "bg-blue-600 text-white"
                  : inRange
                    ? "bg-blue-600/15 text-blue-700 dark:text-blue-300"
                    : "hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              {Number(iso.slice(-2))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pendingStart, setPendingStart] = useState<string | null>(value.start);
  const [pendingEnd, setPendingEnd] = useState<string | null>(value.end);
  const [hoverEnd, setHoverEnd] = useState<string | null>(null);
  const [pickingStart, setPickingStart] = useState(true);
  const [rightMonth, setRightMonth] = useState(() => startOfMonth(new Date(value.end)));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (open) {
      setPendingStart(value.start);
      setPendingEnd(value.end);
      setPickingStart(true);
      setRightMonth(startOfMonth(new Date(value.end)));
    }
  }, [open, value.start, value.end]);

  const leftMonth = new Date(rightMonth.getFullYear(), rightMonth.getMonth() - 1, 1);

  function pick(iso: string) {
    if (pickingStart) {
      setPendingStart(iso);
      setPendingEnd(iso);
      setPickingStart(false);
    } else {
      if (iso < (pendingStart ?? iso)) {
        setPendingStart(iso);
        setPendingEnd(pendingStart);
      } else {
        setPendingEnd(iso);
      }
      setPickingStart(true);
    }
  }

  function apply() {
    if (!pendingStart || !pendingEnd) return;
    const [s, e] = pendingStart <= pendingEnd ? [pendingStart, pendingEnd] : [pendingEnd, pendingStart];
    onChange(rangeFromDates(s, e));
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
      >
        <span className="font-medium">{value.label}</span>
        <span className="text-black/40 dark:text-white/40">
          {formatDateLabel(value.start)} – {formatDateLabel(value.end)}
        </span>
        <span className="text-black/40">▾</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 right-0 flex rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
          <div className="w-40 border-r border-black/10 dark:border-white/10 py-2">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => onChange(p.range())}
                className={`w-full text-left text-sm px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 ${
                  value.label === p.label ? "font-semibold text-blue-600 dark:text-blue-400" : ""
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <button
                className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-sm"
                onClick={() => setRightMonth(new Date(rightMonth.getFullYear(), rightMonth.getMonth() - 1, 1))}
              >
                ‹
              </button>
              <button
                className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-sm"
                onClick={() => setRightMonth(new Date(rightMonth.getFullYear(), rightMonth.getMonth() + 1, 1))}
              >
                ›
              </button>
            </div>
            <div className="flex gap-6" onMouseLeave={() => setHoverEnd(null)}>
              <MonthGrid
                month={leftMonth}
                selStart={pendingStart}
                selEnd={pendingEnd}
                hoverEnd={hoverEnd}
                onPick={pick}
                onHover={setHoverEnd}
              />
              <MonthGrid
                month={rightMonth}
                selStart={pendingStart}
                selEnd={pendingEnd}
                hoverEnd={hoverEnd}
                onPick={pick}
                onHover={setHoverEnd}
              />
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/10 dark:border-white/10">
              <div className="text-sm text-black/60 dark:text-white/60">
                {pendingStart ? formatDateLabel(pendingStart) : "Start"} –{" "}
                {pendingEnd ? formatDateLabel(pendingEnd) : "End"}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="text-sm px-3 py-1.5 rounded-md border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={apply}
                  className="text-sm px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
