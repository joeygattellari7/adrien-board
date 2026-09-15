type Unit = "currency" | "number" | "percent";

function format(value: number, unit: Unit) {
  if (unit === "currency") return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (unit === "percent") return `${value.toFixed(1)}%`;
  return value.toLocaleString();
}

export default function StatCard({
  label,
  value,
  unit,
  change,
}: {
  label: string;
  value: number;
  unit: Unit;
  change?: number;
}) {
  const positive = (change ?? 0) >= 0;
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 p-4 bg-white/60 dark:bg-white/5">
      <div className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">{label}</div>
      <div className="text-2xl font-semibold mt-1">{format(value, unit)}</div>
      {typeof change === "number" && (
        <div className={`text-xs mt-1 ${positive ? "text-emerald-600" : "text-red-500"}`}>
          {positive ? "▲" : "▼"} {Math.abs(change).toFixed(1)}% vs prior period
        </div>
      )}
    </div>
  );
}
