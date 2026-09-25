async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

export type ImageGenRequest = {
  product: string;
  offer?: string;
  tone?: string;
  details?: string;
};

/**
 * Generates a single square product image from a text brief, for use as the
 * source asset in Content Studio's per-platform repurposing pipeline —
 * skipping the "upload a photo" step entirely when there isn't one yet.
 *
 * Requires OPENAI_API_KEY. There's no template fallback here (unlike the
 * copy generators) — an image can't be faked with a fixed placeholder in
 * any useful way, so this throws instead of degrading silently.
 */
export async function generateProductImage(req: ImageGenRequest): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set in this environment");

  const prompt = [
    `A professional, appetizing food-photography style image for a pizzeria called Juliano Pizzaria.`,
    `Subject: ${req.product}.`,
    req.offer ? `Context: ${req.offer}.` : "",
    req.tone ? `Style/mood: ${req.tone}.` : "Style/mood: warm, natural light, close-up, restaurant-quality.",
    req.details ? `Additional direction: ${req.details}.` : "",
    "No text or logos in the image.",
  ]
    .filter(Boolean)
    .join(" ");

  const res = await withTimeout(
    (signal) =>
      fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1024x1024", n: 1 }),
        signal,
      }),
    45000
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Image generation error: ${json.error?.message ?? JSON.stringify(json)}`);

  const b64 = json.data?.[0]?.b64_json as string | undefined;
  if (b64) return b64;

  const url = json.data?.[0]?.url as string | undefined;
  if (!url) throw new Error("Image generation returned no image data");
  const imgRes = await withTimeout((signal) => fetch(url, { signal }), 20000);
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  return buffer.toString("base64");
}
