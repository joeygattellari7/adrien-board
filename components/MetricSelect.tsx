"use client";

import { useEffect, useRef, useState } from "react";

export default function MetricSelect({
  options,
  selected,
  onToggle,
}: {
  options: readonly { key: string; label: string }[];
  selected: Set<string>;
  onToggle: (key: string) => void;
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
      >
        <span className="text-black/40 dark:text-white/40">Metrics:</span>
        <span className="font-medium">{selected.size} selected</span>
        <span className="text-black/40">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-2 right-0 min-w-[200px] rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden py-1">
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => onToggle(o.key)}
              className="w-full flex items-center gap-2 text-left text-sm px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <span
                className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] ${
                  selected.has(o.key)
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-black/20 dark:border-white/20"
                }`}
              >
                {selected.has(o.key) ? "✓" : ""}
              </span>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
