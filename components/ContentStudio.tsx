"use client";

import { useState } from "react";
import { ALL_PLATFORMS, ContentPlatform, PLATFORM_SPECS } from "@/lib/content/platforms";

type ResultRow = {
  platform: ContentPlatform;
  spec: (typeof PLATFORM_SPECS)[ContentPlatform];
  caption: string;
  hashtags: string[];
  resizedImageBase64?: string;
  resizedVideoUrl?: string;
  mediaNote?: string;
};

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ScheduleRow({ result, originalFile }: { result: ResultRow; originalFile: File | null }) {
  const [when, setWhen] = useState("");
  const [caption, setCaption] = useState(result.caption);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const mediaType = originalFile ? (originalFile.type.startsWith("video/") ? "video" : "image") : result.resizedImageBase64 ? "image" : undefined;

  async function schedule() {
    if (!when) return;
    setSaving(true);
    setDone(null);
    try {
      const mediaBase64 = mediaType === "image" ? result.resizedImageBase64 : undefined;
      const mediaUrl = mediaType === "video" ? result.resizedVideoUrl : undefined;
      const res = await fetch("/api/content/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: result.platform,
          caption,
          hashtags: result.hashtags,
          mediaBase64,
          mediaUrl,
          mediaType: mediaBase64 || mediaUrl ? mediaType : undefined,
          scheduledFor: new Date(when).toISOString(),
        }),
      });
      const data = await res.json();
      if (res.ok) setDone(data.post.status === "published" ? "Published now" : data.post.status === "failed" ? `Failed: ${data.post.error}` : "Added to queue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900 overflow-hidden">
      <div className="p-3 border-b border-white/10 flex items-center justify-between">
        <span className="text-sm font-semibold">{result.spec.label}</span>
        <span className="text-[10px] text-white/40">{result.spec.imageAspect.ratio} · {result.spec.captionMaxChars} char max</span>
      </div>
      {result.resizedVideoUrl ? (
        <video src={result.resizedVideoUrl} controls className="w-full aspect-video bg-black" />
      ) : result.resizedImageBase64 ? (
        <img src={`data:image/jpeg;base64,${result.resizedImageBase64}`} alt="" className="w-full aspect-video object-cover" />
      ) : null}
      {result.mediaNote && <div className="px-3 pt-2 text-[11px] text-amber-400">{result.mediaNote}</div>}
      <div className="p-3">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={4}
          maxLength={result.spec.captionMaxChars}
          className="w-full rounded-lg border border-white/15 bg-transparent px-2.5 py-1.5 text-sm"
        />
        {result.hashtags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {result.hashtags.map((h) => (
              <span key={h} className="text-[11px] text-blue-400">#{h}</span>
            ))}
          </div>
        )}
        <div className="mt-2.5 flex items-center gap-2">
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="flex-1 rounded-lg border border-white/15 bg-transparent px-2.5 py-1.5 text-xs" />
          <button
            onClick={schedule}
            disabled={saving || !when}
            className="rounded-lg bg-white text-black text-xs font-semibold px-3 py-1.5 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Schedule"}
          </button>
        </div>
        {done && <div className="mt-1.5 text-xs text-emerald-400">{done}</div>}
        {!result.spec.autoPublish && <div className="mt-1 text-[10px] text-white/40">No posting API yet for {result.spec.label} — queued as a reminder to post manually.</div>}
      </div>
    </div>
  );
}

export default function ContentStudio() {
  const [product, setProduct] = useState("Margherita Pizza");
  const [offer, setOffer] = useState("");
  const [tone, setTone] = useState("");
  const [details, setDetails] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [generatedImageBase64, setGeneratedImageBase64] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generateImageError, setGenerateImageError] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<ContentPlatform[]>(ALL_PLATFORMS);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [copySource, setCopySource] = useState<"ai" | "template" | null>(null);

  function togglePlatform(p: ContentPlatform) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function handleGenerateImage() {
    setGeneratingImage(true);
    setGenerateImageError(null);
    try {
      const res = await fetch("/api/content/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, offer: offer || undefined, tone: tone || undefined, details: details || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedImageBase64(data.base64);
        setFile(null);
      } else {
        setGenerateImageError(data.error ?? "Failed to generate image");
      }
    } finally {
      setGeneratingImage(false);
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setResults(null);
    try {
      const mediaType = file || generatedImageBase64 ? (file?.type.startsWith("video/") ? "video" : "image") : undefined;
      const mediaBase64 = mediaType === "image" ? (file ? await fileToBase64(file) : generatedImageBase64 ?? undefined) : mediaType === "video" && file ? await fileToBase64(file) : undefined;
      const res = await fetch("/api/content/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product,
          offer: offer || undefined,
          tone: tone || undefined,
          details: details || undefined,
          platforms,
          mediaType,
          mediaBase64,
          mediaMimeType: file?.type,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data.results);
        setCopySource(data.copySource);
      }
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-8">
      <section className="mb-10 rounded-2xl border-2 border-fuchsia-500/25 bg-fuchsia-950/10 p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-500" />
          <h2 className="text-xl font-bold tracking-tight">Content Studio</h2>
        </div>
        <p className="text-sm text-white/50 mb-5">
          Upload a photo or video to repurpose it across every platform — or leave it blank to just generate captions from scratch. Each platform gets its own crop and caption, then queue it in the Scheduler.
        </p>

        <form onSubmit={handleGenerate} className="rounded-xl border border-white/10 bg-zinc-900 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-white/50">Product / focus</label>
              <input value={product} onChange={(e) => setProduct(e.target.value)} className="w-full mt-1 rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-white/50">Offer (optional)</label>
              <input value={offer} onChange={(e) => setOffer(e.target.value)} className="w-full mt-1 rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm" placeholder="e.g. 20% off this weekend" />
            </div>
            <div>
              <label className="text-xs font-medium text-white/50">Tone (optional)</label>
              <input value={tone} onChange={(e) => setTone(e.target.value)} className="w-full mt-1 rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm" placeholder="e.g. fun and casual" />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium text-white/50">Extra details / brief (optional)</label>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={2} className="w-full mt-1 rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm" />
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium text-white/50 block mb-1">Photo or video (optional)</label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setGeneratedImageBase64(null);
                }}
                disabled={!!generatedImageBase64}
                className="text-sm disabled:opacity-40"
              />
              <span className="text-xs text-white/30">or</span>
              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={generatingImage || !!file || !product}
                className="text-xs font-medium rounded-lg border border-fuchsia-500/40 text-fuchsia-400 px-3 py-1.5 hover:bg-fuchsia-950/30 disabled:opacity-40"
              >
                {generatingImage ? "Generating…" : "✨ Generate an image with AI"}
              </button>
            </div>
            {file && <div className="text-xs text-white/40 mt-1">{file.name} ({file.type.startsWith("video/") ? "video" : "image"})</div>}
            {generateImageError && <div className="text-xs text-red-400 mt-1">{generateImageError}</div>}
            {generatedImageBase64 && (
              <div className="mt-2 flex items-center gap-2">
                <img src={`data:image/png;base64,${generatedImageBase64}`} alt="" className="w-16 h-16 rounded-lg object-cover" />
                <button type="button" onClick={() => setGeneratedImageBase64(null)} className="text-xs text-red-400 hover:underline">
                  Remove
                </button>
              </div>
            )}
          </div>
          <div className="mb-4">
            <label className="text-xs font-medium text-white/50 block mb-1.5">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map((p) => (
                <label key={p} className={`text-xs px-2.5 py-1.5 rounded-full border cursor-pointer ${platforms.includes(p) ? "bg-fuchsia-600 text-white border-fuchsia-600" : "border-white/15"}`}>
                  <input type="checkbox" checked={platforms.includes(p)} onChange={() => togglePlatform(p)} className="hidden" />
                  {PLATFORM_SPECS[p].label}
                </label>
              ))}
            </div>
          </div>
          <button type="submit" disabled={generating || !product || platforms.length === 0} className="rounded-lg bg-fuchsia-600 text-white text-sm font-medium px-4 py-2 hover:bg-fuchsia-700 disabled:opacity-50">
            {generating ? "Generating…" : `Generate for ${platforms.length} platform${platforms.length !== 1 ? "s" : ""}`}
          </button>
        </form>

        {results && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {results.map((r) => (
                <ScheduleRow key={r.platform} result={r} originalFile={file} />
              ))}
            </div>
            {copySource && (
              <div className="text-xs text-white/40 mt-3">
                {copySource === "ai" ? "Captions generated by AI" : "Captions generated from templates (set ANTHROPIC_API_KEY for AI-written copy)"}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
