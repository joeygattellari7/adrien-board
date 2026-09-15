"use client";

import { useEffect, useRef, useState } from "react";
import { COMPARE_OPTIONS, CompareOption } from "@/lib/dateRange";

export default function CompareToSelect({
  value,
  onChange,
}: {
  value: CompareOption;
  onChange: (option: CompareOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = COMPARE_OPTIONS.find((o) => o.value === value) ?? COMPARE_OPTIONS[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
      >
        <span className="text-black/40 dark:text-white/40">Compare:</span>
        <span className="font-medium">{current.label}</span>
        <span className="text-black/40">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-2 right-0 min-w-[180px] rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden py-1">
          {COMPARE_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`w-full text-left text-sm px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 ${
                o.value === value ? "font-semibold text-blue-600 dark:text-blue-400" : ""
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
