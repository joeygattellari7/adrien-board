"use client";

import { useState } from "react";
import { CopyVariation } from "@/lib/creative/generateCopy";
import { Gender, MetaObjective } from "@/lib/creative/metaCampaign";

const OBJECTIVES: { value: MetaObjective; label: string }[] = [
  { value: "OUTCOME_TRAFFIC", label: "Traffic (clicks to site)" },
  { value: "OUTCOME_ENGAGEMENT", label: "Engagement (likes/comments/shares)" },
  { value: "OUTCOME_AWARENESS", label: "Awareness (reach)" },
  { value: "OUTCOME_SALES", label: "Conversions (requires a pixel)" },
];

const CTA_OPTIONS = ["Order Now", "Learn More", "Shop Now", "Get Offer", "Sign Up"];
const CONVERSION_EVENTS = ["PURCHASE", "ADD_TO_CART", "INITIATE_CHECKOUT", "LEAD", "COMPLETE_REGISTRATION"];

type LaunchResult = {
  campaignId: string;
  adSetId: string;
  adId: string;
  manageUrl: string;
  status: string;
};

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ImageDrop({
  label,
  ratioClass,
  file,
  onChange,
}: {
  label: string;
  ratioClass: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const url = file ? URL.createObjectURL(file) : null;
  return (
    <div>
      <label className="text-xs font-medium text-black/50 dark:text-white/50">{label}</label>
      <div className={`mt-1 relative w-full max-w-[220px] ${ratioClass} rounded-lg border border-dashed border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 overflow-hidden flex items-center justify-center`}>
        {url ? (
          <img src={url} alt={label} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-black/40 dark:text-white/40 px-2 text-center">No image</span>
        )}
      </div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="w-full mt-2 text-xs"
      />
    </div>
  );
}

export default function CreativeFactory() {
  // Copy generator state
  const [product, setProduct] = useState("Margherita Pizza");
  const [offer, setOffer] = useState("");
  const [tone, setTone] = useState("");
  const [details, setDetails] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copySource, setCopySource] = useState<"ai" | "template" | null>(null);
  const [variations, setVariations] = useState<CopyVariation[]>([]);

  // Campaign builder state
  const [campaignName, setCampaignName] = useState("");
  const [adSetName, setAdSetName] = useState("");
  const [objective, setObjective] = useState<MetaObjective>("OUTCOME_TRAFFIC");
  const [dailyBudget, setDailyBudget] = useState("20");
  const [linkUrl, setLinkUrl] = useState("");
  const [headline, setHeadline] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [description, setDescription] = useState("");
  const [cta, setCta] = useState("Order Now");

  // Targeting
  const [countries, setCountries] = useState("AU");
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("65");
  const [gender, setGender] = useState<Gender>("all");
  const [interests, setInterests] = useState("");

  // Conversion objective
  const [pixelId, setPixelId] = useState("");
  const [conversionEvent, setConversionEvent] = useState("PURCHASE");

  // Images
  const [squareImage, setSquareImage] = useState<File | null>(null);
  const [verticalImage, setVerticalImage] = useState<File | null>(null);

  const [previewing, setPreviewing] = useState(false);
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
        body: JSON.stringify({
          product,
          offer: offer || undefined,
          tone: tone || undefined,
          details: details || undefined,
          count: 3,
        }),
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
    if (!campaignName) {
      const base = `${product} — ${new Date().toLocaleDateString()}`;
      setCampaignName(base);
      setAdSetName(`${base} — Ad Set`);
    }
  }

  function startPreview(e: React.FormEvent) {
    e.preventDefault();
    setLaunchError(null);
    setPreviewing(true);
  }

  async function handleConfirmLaunch() {
    setLaunching(true);
    setLaunchError(null);
    setLaunchResult(null);
    setActivated(false);
    try {
      const squareImageBase64 = squareImage ? await fileToBase64(squareImage) : undefined;
      const verticalImageBase64 = verticalImage ? await fileToBase64(verticalImage) : undefined;
      const res = await fetch("/api/creative/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName,
          adSetName,
          objective,
          dailyBudget: Number(dailyBudget),
          headline,
          primaryText,
          description,
          cta,
          linkUrl,
          targeting: {
            countries: countries.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean),
            ageMin: Number(ageMin),
            ageMax: Number(ageMax),
            gender,
            interests: interests || undefined,
          },
          pixelId: objective === "OUTCOME_SALES" ? pixelId : undefined,
          conversionEvent: objective === "OUTCOME_SALES" ? conversionEvent : undefined,
          squareImageBase64,
          verticalImageBase64,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLaunchError(data.error ?? "Failed to create campaign");
        setPreviewing(false);
        return;
      }
      setLaunchResult(data);
      setPreviewing(false);
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
          <div className="mb-3">
            <label className="text-xs font-medium text-black/50 dark:text-white/50">Extra details / brief (optional)</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="Anything else the copy should reflect — must-include phrases, brand guidelines, specific ingredients, promo terms, etc."
              className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
            />
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
          spends until you review it and click Activate.
        </p>

        {!previewing && !launchResult && (
          <form onSubmit={startPreview} className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-4">
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
                <label className="text-xs font-medium text-black/50 dark:text-white/50">Ad set name</label>
                <input
                  value={adSetName}
                  onChange={(e) => setAdSetName(e.target.value)}
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
              <div className="md:col-span-2">
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

            {objective === "OUTCOME_SALES" && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-black/50 dark:text-white/50">Pixel / dataset ID</label>
                  <input
                    value={pixelId}
                    onChange={(e) => setPixelId(e.target.value)}
                    required
                    placeholder="Pixel ID from Events Manager"
                    className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-black/50 dark:text-white/50">Conversion event</label>
                  <select
                    value={conversionEvent}
                    onChange={(e) => setConversionEvent(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
                  >
                    {CONVERSION_EVENTS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400 md:col-span-2">
                  Note: Juliano Pizzaria's Meta account has no pixel configured yet — this objective will fail until one
                  is set up.
                </p>
              </div>
            )}

            <div>
              <div className="text-sm font-semibold mb-2">Audience targeting</div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-black/50 dark:text-white/50">Countries</label>
                  <input
                    value={countries}
                    onChange={(e) => setCountries(e.target.value)}
                    placeholder="AU, NZ"
                    className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-black/50 dark:text-white/50">Age min</label>
                  <input
                    type="number"
                    min={13}
                    max={65}
                    value={ageMin}
                    onChange={(e) => setAgeMin(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-black/50 dark:text-white/50">Age max</label>
                  <input
                    type="number"
                    min={13}
                    max={65}
                    value={ageMax}
                    onChange={(e) => setAgeMax(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-black/50 dark:text-white/50">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="md:col-span-4">
                  <label className="text-xs font-medium text-black/50 dark:text-white/50">
                    Interests (comma-separated — matched to Meta's interest targeting by name, best match used)
                  </label>
                  <input
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    placeholder="e.g. Pizza, Italian cuisine, Food delivery"
                    className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
                  />
                </div>
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
              <div className="text-sm font-semibold mb-2">Images</div>
              <p className="text-xs text-black/50 dark:text-white/50 mb-3">
                Provide both a square (1:1, feeds) and vertical (9:16, Stories/Reels) image and Meta will
                automatically serve the right one per placement. Either alone also works.
              </p>
              <div className="flex flex-wrap gap-6">
                <ImageDrop label="Square (1:1)" ratioClass="aspect-square" file={squareImage} onChange={setSquareImage} />
                <ImageDrop label="Vertical (9:16)" ratioClass="aspect-[9/16]" file={verticalImage} onChange={setVerticalImage} />
              </div>
            </div>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700"
            >
              Preview ad
            </button>
          </form>
        )}

        {previewing && (
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4">
            <div className="text-sm font-semibold mb-3">Review before creating in Meta</div>
            <div className="flex flex-wrap gap-6 mb-4">
              {squareImage && (
                <div className="w-40 aspect-square rounded-lg overflow-hidden border border-black/10 dark:border-white/10">
                  <img src={URL.createObjectURL(squareImage)} alt="Square preview" className="w-full h-full object-cover" />
                </div>
              )}
              {verticalImage && (
                <div className="w-32 aspect-[9/16] rounded-lg overflow-hidden border border-black/10 dark:border-white/10">
                  <img src={URL.createObjectURL(verticalImage)} alt="Vertical preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-[220px] rounded-lg border border-black/10 dark:border-white/10 p-3">
                <div className="text-xs text-black/40 dark:text-white/40 mb-1">Juliano Pizzaria — Sponsored</div>
                <div className="font-semibold text-sm">{headline}</div>
                <div className="text-sm text-black/70 dark:text-white/70 mb-1">{primaryText}</div>
                <div className="text-xs text-black/40 dark:text-white/40">{description}</div>
                <div className="mt-2 inline-block text-xs font-medium bg-black/10 dark:bg-white/10 rounded px-2 py-1">{cta}</div>
              </div>
            </div>
            <div className="text-xs text-black/50 dark:text-white/50 mb-4 space-y-1">
              <div><span className="font-medium">Campaign:</span> {campaignName} ({OBJECTIVES.find((o) => o.value === objective)?.label})</div>
              <div><span className="font-medium">Ad set:</span> {adSetName} — ${dailyBudget}/day</div>
              <div><span className="font-medium">Audience:</span> {countries}, ages {ageMin}-{ageMax}, {gender}{interests ? `, interests: ${interests}` : ""}</div>
              <div><span className="font-medium">Link:</span> {linkUrl}</div>
            </div>
            {launchError && (
              <div className="rounded-lg border border-red-500/30 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-sm p-3 mb-4">
                {launchError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewing(false)}
                className="rounded-lg border border-black/15 dark:border-white/15 text-sm px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10"
              >
                Back to edit
              </button>
              <button
                onClick={handleConfirmLaunch}
                disabled={launching}
                className="rounded-lg bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
              >
                {launching ? "Creating…" : "Create draft campaign (paused)"}
              </button>
            </div>
          </div>
        )}

        {launchResult && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-4">
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
              <button
                onClick={() => {
                  setLaunchResult(null);
                  setActivated(false);
                }}
                className="rounded-lg border border-black/15 dark:border-white/15 text-sm px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
              >
                Start another
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
