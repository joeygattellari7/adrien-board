import { Insight } from "@/lib/types";

const sentimentStyles: Record<Insight["sentiment"], string> = {
  positive: "border-emerald-500/40 bg-emerald-500/5",
  negative: "border-red-500/40 bg-red-500/5",
  neutral: "border-black/10 dark:border-white/10",
};

export default function InsightsPanel({ insights, title }: { insights: Insight[]; title: string }) {
  if (insights.length === 0) return null;
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="grid gap-2">
        {insights.map((insight) => (
          <div key={insight.id} className={`rounded-lg border p-3 text-sm ${sentimentStyles[insight.sentiment]}`}>
            <div className="font-medium">{insight.title}</div>
            <div className="text-black/60 dark:text-white/60 mt-0.5">{insight.detail}</div>
            {insight.recommendation && (
              <div className="mt-1 text-black/80 dark:text-white/80">
                <span className="font-medium">Try: </span>
                {insight.recommendation}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
