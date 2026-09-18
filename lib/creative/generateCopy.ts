export type CopyVariation = {
  headline: string;
  primaryText: string;
  description: string;
  cta: string;
};

export type CopyRequest = {
  product: string; // e.g. "Margherita Pizza"
  offer?: string; // e.g. "20% off this weekend"
  tone?: string; // e.g. "fun and casual"
  details?: string; // free-form extra context/brief, e.g. brand guidelines, must-include phrases
  count?: number;
};

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

const CTA_OPTIONS = ["Order Now", "Learn More", "Shop Now", "Get Offer", "Sign Up"];

function templateVariations(req: CopyRequest): CopyVariation[] {
  const count = req.count ?? 3;
  const offer = req.offer ? ` — ${req.offer}` : "";
  const templates: CopyVariation[] = [
    {
      headline: `${req.product}${offer}`,
      primaryText: `Craving ${req.product}? Fresh from the oven, made your way. ${req.offer ?? "Order online today."}`,
      description: "Fast delivery. Fresh ingredients.",
      cta: "Order Now",
    },
    {
      headline: `Your Next ${req.product} Is Waiting`,
      primaryText: `Juliano Pizzaria's ${req.product} is a local favorite for a reason. ${req.offer ?? "Try it tonight."}`,
      description: "Order online or in-store.",
      cta: "Learn More",
    },
    {
      headline: `${req.offer ?? `Fresh ${req.product}, Delivered`}`,
      primaryText: `Nothing beats a hot ${req.product} from Juliano Pizzaria. ${req.offer ?? ""}`.trim(),
      description: "Locally loved. Order now.",
      cta: "Shop Now",
    },
  ];
  return templates.slice(0, count).map((t, i) => ({
    ...t,
    cta: t.cta || CTA_OPTIONS[i % CTA_OPTIONS.length],
    primaryText: req.details ? `${t.primaryText} ${req.details}`.trim() : t.primaryText,
  }));
}

async function anthropicVariations(req: CopyRequest, apiKey: string): Promise<CopyVariation[] | null> {
  const count = req.count ?? 3;
  const prompt = `Write ${count} short Meta/Google ad copy variations for a pizzeria called "Juliano Pizzaria".
Product/focus: ${req.product}
${req.offer ? `Offer: ${req.offer}` : ""}
${req.tone ? `Tone: ${req.tone}` : "Tone: warm, appetizing, locally-owned feel"}
${req.details ? `Additional details/brief from the marketer — follow these closely:\n${req.details}` : ""}

Respond ONLY with a JSON array of ${count} objects, each with keys: headline (max 40 chars), primaryText (max 125 chars), description (max 30 chars), cta (one of: Order Now, Learn More, Shop Now, Get Offer, Sign Up). No markdown, no explanation, just the JSON array.`;

  try {
    const res = await withTimeout(
      (signal) =>
        fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-5",
            max_tokens: 1024,
            messages: [{ role: "user", content: prompt }],
          }),
          signal,
        }),
      15000
    );
    if (!res.ok) return null;
    const json = await res.json();
    const text = json.content?.[0]?.text ?? "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return null;
    return parsed.slice(0, count);
  } catch {
    return null;
  }
}

/**
 * Generates ad copy variations. Uses the Anthropic API when ANTHROPIC_API_KEY
 * is configured for genuinely varied, on-brief copy; otherwise falls back to
 * deterministic templates so this always returns something usable.
 */
export async function generateAdCopy(req: CopyRequest): Promise<{ variations: CopyVariation[]; source: "ai" | "template" }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    const aiResult = await anthropicVariations(req, apiKey);
    if (aiResult && aiResult.length > 0) return { variations: aiResult, source: "ai" };
  }
  return { variations: templateVariations(req), source: "template" };
}
