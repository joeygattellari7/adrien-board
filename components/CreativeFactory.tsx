"use client";

import { useState } from "react";
import { CopyVariation } from "@/lib/creative/generateCopy";
import { MetaObjective } from "@/lib/creative/metaCampaign";

const OBJECTIVES: { value: MetaObjective; label: string }[] = [
  { value: "OUTCOME_TRAFFIC", label: "Traffic (clicks to site)" },
  { value: "OUTCOME_ENGAGEMENT", label: "Engagement (likes/comments/shares)" },
  { value: "OUTCOME_AWARENESS", label: "Awareness (reach)" },
];

const CTA_OPTIONS = ["Order Now", "Learn More", "Shop Now", "Get Offer", "Sign Up"];

type LaunchResult = {
  campaignId: string;
  adSetId: string;
  adId: string;
  manageUrl: string;
  status: string;
};

export default function CreativeFactory() {
  // Copy generator state
  const [product, setProduct] = useState("Margherita Pizza");
  const [offer, setOffer] = useState("");
  const [tone, setTone] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copySource, setCopySource] = useState<"ai" | "template" | null>(null);
  const [variations, setVariations] = useState<CopyVariation[]>([]);

  // Campaign builder state
  const [campaignName, setCampaignName] = useState("");
  const [objective, setObjective] = useState<MetaObjective>("OUTCOME_TRAFFIC");
  const [dailyBudget, setDailyBudget] = useState("20");
  const [linkUrl, setLinkUrl] = useState("");
  const [headline, setHeadline] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [description, setDescription] = useState("");
  const [cta, setCta] = useState("Order Now");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launchResult, setLaunchResult] = useState<LaunchResult | null>(null);
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);

  async function handleGenerateCopy(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch("/api/creative/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, offer: offer || undefined, tone: tone || undefined, count: 3 }),
      });
      const data = await res.json();
      setVariations(data.variations ?? []);
      setCopySource(data.source ?? null);
    } finally {
      setGenerating(false);
    }
  }

  function useVariation(v: CopyVariation) {
    setHeadline(v.headline);
    setPrimaryText(v.primaryText);
    setDescription(v.description);
    setCta(v.cta);
    if (!campaignName) setCampaignName(`${product} — ${new Date().toLocaleDateString()}`);
  }

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleLaunch(e: React.FormEvent) {
    e.preventDefault();
    setLaunching(true);
    setLaunchError(null);
    setLaunchResult(null);
    setActivated(false);
    try {
      const imageBase64 = imageFile ? await fileToBase64(imageFile) : undefined;
      const res = await fetch("/api/creative/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName,
          objective,
          dailyBudget: Number(dailyBudget),
          headline,
          primaryText,
          description,
          cta,
          linkUrl,
          imageBase64,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLaunchError(data.error ?? "Failed to create campaign");
        return;
      }
      setLaunchResult(data);
    } finally {
      setLaunching(false);
    }
  }

  async function handleActivate() {
    if (!launchResult) return;
    setActivating(true);
    try {
      const res = await fetch("/api/creative/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adId: launchResult.adId, adSetId: launchResult.adSetId }),
      });
      const data = await res.json();
      if (res.ok) setActivated(true);
      else setLaunchError(data.error ?? "Failed to activate");
    } finally {
      setActivating(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-8">
      {/* Ad copy generator */}
      <section className="mb-10 rounded-2xl border-2 border-purple-500/25 dark:border-purple-400/25 bg-purple-50/40 dark:bg-purple-950/15 p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
          <h2 className="text-xl font-bold tracking-tight">Ad Copy Generator</h2>
        </div>
        <form onSubmit={handleGenerateCopy} className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-black/50 dark:text-white/50">Product / focus</label>
              <input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
                placeholder="e.g. Margherita Pizza"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-black/50 dark:text-white/50">Offer (optional)</label>
              <input
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
                placeholder="e.g. 20% off this weekend"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-black/50 dark:text-white/50">Tone (optional)</label>
              <input
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
                placeholder="e.g. fun and casual"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={generating || !product}
            className="rounded-lg bg-purple-600 text-white text-sm font-medium px-4 py-2 hover:bg-purple-700 disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate copy"}
          </button>
        </form>

        {variations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {variations.map((v, i) => (
              <div key={i} className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4">
                <div className="font-semibold text-sm mb-1">{v.headline}</div>
                <div className="text-sm text-black/70 dark:text-white/70 mb-2">{v.primaryText}</div>
                <div className="text-xs text-black/40 dark:text-white/40 mb-3">{v.description}</div>
                <button
                  onClick={() => useVariation(v)}
                  className="w-full rounded-lg border border-purple-500/40 text-purple-700 dark:text-purple-300 text-xs font-medium py-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                >
                  Use this in campaign below
                </button>
              </div>
            ))}
          </div>
        )}
        {copySource && (
          <div className="text-xs text-black/40 dark:text-white/40 mt-3">
            {copySource === "ai" ? "Generated by AI" : "Generated from templates (set ANTHROPIC_API_KEY for AI-written copy)"}
          </div>
        )}
      </section>

      {/* Campaign builder & launcher */}
      <section className="mb-10 rounded-2xl border-2 border-blue-500/25 dark:border-blue-400/25 bg-blue-50/40 dark:bg-blue-950/15 p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          <h2 className="text-xl font-bold tracking-tight">Campaign Builder — Meta</h2>
        </div>
        <p className="text-sm text-black/50 dark:text-white/50 mb-5">
          Creates a campaign, ad set, and ad in Meta — always <span className="font-semibold">paused</span>. Nothing
          spends until you review it and click Activate below.
        </p>

        <form onSubmit={handleLaunch} className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-black/50 dark:text-white/50">Campaign name</label>
              <input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                required
                className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-black/50 dark:text-white/50">Objective</label>
              <select
                value={objective}
                onChange={(e) => setObjective(e.target.value as MetaObjective)}
                className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
              >
                {OBJECTIVES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-black/50 dark:text-white/50">Daily budget (AUD)</label>
              <input
                type="number"
                min={2}
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
                required
                className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-black/50 dark:text-white/50">Link URL</label>
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                required
                placeholder="https://julianopizzaria.bitebusiness.com/"
                className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-black/50 dark:text-white/50">Headline</label>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              required
              className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-black/50 dark:text-white/50">Primary text</label>
            <textarea
              value={primaryText}
              onChange={(e) => setPrimaryText(e.target.value)}
              required
              rows={2}
              className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-black/50 dark:text-white/50">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-black/50 dark:text-white/50">Call to action</label>
              <select
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
              >
                {CTA_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-black/50 dark:text-white/50">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="w-full mt-1 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={launching}
            className="rounded-lg bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
          >
            {launching ? "Creating…" : "Create draft campaign (paused)"}
          </button>
        </form>

        {launchError && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-sm p-3">
            {launchError}
          </div>
        )}

        {launchResult && (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-4">
            <div className="text-sm font-medium mb-1">
              Draft created — status: <span className="font-mono">{activated ? "ACTIVE" : launchResult.status}</span>
            </div>
            <div className="text-xs text-black/50 dark:text-white/50 mb-3">
              Campaign {launchResult.campaignId} · Ad set {launchResult.adSetId} · Ad {launchResult.adId}
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={launchResult.manageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-black/15 dark:border-white/15 text-sm px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
              >
                Review in Meta Ads Manager
              </a>
              {!activated ? (
                <button
                  onClick={handleActivate}
                  disabled={activating}
                  className="rounded-lg bg-emerald-600 text-white text-sm font-medium px-3 py-1.5 hover:bg-emerald-700 disabled:opacity-50"
                >
                  {activating ? "Activating…" : "Activate — start spending"}
                </button>
              ) : (
                <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium px-3 py-1.5">
                  ✓ Activated — live on Meta
                </span>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
