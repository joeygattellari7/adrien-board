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

export type GoogleCopyRequest = {
  product: string;
  offer?: string;
  tone?: string;
  details?: string;
};

export type GoogleCopyResult = {
  headlines: string[]; // <=30 chars each
  descriptions: string[]; // <=90 chars each
};

function templateGoogleCopy(req: GoogleCopyRequest): GoogleCopyResult {
  const headlines = [
    req.product,
    `Order ${req.product} Online`,
    `Fresh ${req.product} Today`,
    req.offer ? `${req.offer}` : `Juliano Pizzaria`,
    "Fast Local Delivery",
    `${req.product} Near You`,
    "Order Online Now",
    "Locally Made, Fresh Daily",
  ].map((h) => h.slice(0, 30));

  const descriptions = [
    `Order ${req.product} online for fast delivery or pickup.${req.offer ? ` ${req.offer}` : ""}`.slice(0, 90),
    "Fresh ingredients, made to order. Juliano Pizzaria — your local favorite.".slice(0, 90),
    (req.details ? req.details : "Order now and taste the difference.").slice(0, 90),
    "Fast delivery. Easy online ordering. Order today.".slice(0, 90),
  ];

  return { headlines, descriptions };
}

async function anthropicGoogleCopy(req: GoogleCopyRequest, apiKey: string): Promise<GoogleCopyResult | null> {
  const prompt = `Write Google Search ad copy for a pizzeria called "Juliano Pizzaria".
Product/focus: ${req.product}
${req.offer ? `Offer: ${req.offer}` : ""}
${req.tone ? `Tone: ${req.tone}` : "Tone: warm, appetizing, locally-owned feel"}
${req.details ? `Additional details/brief from the marketer — follow these closely:\n${req.details}` : ""}

Respond ONLY with a JSON object with two keys: "headlines" (an array of 8 strings, each 30 characters or fewer) and "descriptions" (an array of 4 strings, each 90 characters or fewer). No markdown, no explanation, just the JSON object.`;

  try {
    const res = await withTimeout(
      (signal) =>
        fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 1024, messages: [{ role: "user", content: prompt }] }),
          signal,
        }),
      15000
    );
    if (!res.ok) return null;
    const json = await res.json();
    const text = json.content?.[0]?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.headlines) || !Array.isArray(parsed.descriptions)) return null;
    return {
      headlines: parsed.headlines.slice(0, 15).map((h: string) => String(h).slice(0, 30)),
      descriptions: parsed.descriptions.slice(0, 4).map((d: string) => String(d).slice(0, 90)),
    };
  } catch {
    return null;
  }
}

/**
 * Generates Google Search/Display/Performance Max ad copy (headlines capped
 * at 30 chars, descriptions at 90 chars, per Google's asset limits). Uses
 * the Anthropic API when configured, otherwise falls back to templates.
 */
export async function generateGoogleAdCopy(
  req: GoogleCopyRequest
): Promise<{ result: GoogleCopyResult; source: "ai" | "template" }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    const aiResult = await anthropicGoogleCopy(req, apiKey);
    if (aiResult && aiResult.headlines.length > 0) return { result: aiResult, source: "ai" };
  }
  return { result: templateGoogleCopy(req), source: "template" };
}

export type KeywordIdea = { text: string; matchType: "BROAD" | "PHRASE" | "EXACT" };

function templateKeywords(product: string): KeywordIdea[] {
  return [
    { text: product, matchType: "PHRASE" },
    { text: `${product} near me`, matchType: "PHRASE" },
    { text: `order ${product}`, matchType: "PHRASE" },
    { text: `${product} delivery`, matchType: "PHRASE" },
    { text: `best ${product}`, matchType: "BROAD" },
    { text: product, matchType: "EXACT" },
  ];
}

async function anthropicKeywords(product: string, apiKey: string): Promise<KeywordIdea[] | null> {
  const prompt = `Suggest 10 Google Ads Search keyword ideas for a pizzeria's Search campaign, focused on: "${product}".
Respond ONLY with a JSON array of objects shaped like {"text": "...", "matchType": "BROAD"|"PHRASE"|"EXACT"}. No markdown, no explanation, just the JSON array.`;

  try {
    const res = await withTimeout(
      (signal) =>
        fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 1024, messages: [{ role: "user", content: prompt }] }),
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
    return parsed
      .filter((k) => k && typeof k.text === "string")
      .slice(0, 10)
      .map((k) => ({ text: k.text, matchType: (["BROAD", "PHRASE", "EXACT"].includes(k.matchType) ? k.matchType : "PHRASE") as KeywordIdea["matchType"] }));
  } catch {
    return null;
  }
}

/**
 * Generates keyword ideas for a Google Search campaign's ad group. Uses the
 * Anthropic API when configured, otherwise falls back to a fixed set of
 * common intent-based keyword patterns.
 */
export async function generateKeywordIdeas(product: string): Promise<{ keywords: KeywordIdea[]; source: "ai" | "template" }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    const aiResult = await anthropicKeywords(product, apiKey);
    if (aiResult && aiResult.length > 0) return { keywords: aiResult, source: "ai" };
  }
  return { keywords: templateKeywords(product), source: "template" };
}
