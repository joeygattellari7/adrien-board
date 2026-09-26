"use client";

import { useEffect, useState } from "react";
import { PLATFORM_SPECS } from "@/lib/content/platforms";
import { ContentProposal } from "@/lib/content/planner";
import { LibraryAsset } from "@/lib/content/library";
import { BrandBrief } from "@/lib/content/brandBrief";
import { CalendarDay } from "@/lib/content/calendar";

const TONE_STYLE: Record<string, string> = {
  funny: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  serious: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  warm: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  informative: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const URGENCY_STYLE: Record<string, string> = {
  overdue: "bg-red-500/15 text-red-400 border-red-500/30",
  due_soon: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};
const URGENCY_LABEL: Record<string, string> = {
  overdue: "Overdue",
  due_soon: "Due soon",
};

function ProposalCard({ proposal, onScheduled }: { proposal: ContentProposal; onScheduled: (platform: string) => void }) {
  const [when, setWhen] = useState(proposal.suggestedTime.slice(0, 16));
  const [caption, setCaption] = useState(proposal.caption);
  const [generatedBase64, setGeneratedBase64] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spec = PLATFORM_SPECS[proposal.platform];

  async function generateNow() {
    setGenerating(true);
    try {
      const res = await fetch("/api/content/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: caption.slice(0, 60) }),
      });
      const data = await res.json();
      if (res.ok) setGeneratedBase64(data.base64);
      else setError(data.error);
    } finally {
      setGenerating(false);
    }
  }

  async function approve() {
    setSaving(true);
    setError(null);
    try {
      const isVideo = proposal.asset?.type === "video";
      const mediaBase64 = !isVideo ? proposal.asset?.base64 ?? generatedBase64 ?? undefined : undefined;
      const mediaUrl = isVideo ? proposal.asset?.mediaUrl : undefined;
      const res = await fetch("/api/content/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: proposal.platform,
          caption,
          hashtags: proposal.hashtags,
          mediaBase64,
          mediaUrl,
          mediaType: mediaBase64 || mediaUrl ? (isVideo ? "video" : "image") : undefined,
          scheduledFor: new Date(when).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to schedule");
        return;
      }
      if (proposal.asset) {
        await fetch("/api/content/library", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: proposal.asset.id }),
        });
      }
      onScheduled(proposal.platform);
    } finally {
      setSaving(false);
    }
  }

  const isVideoAsset = proposal.asset?.type === "video";
  const previewImage = !isVideoAsset ? proposal.asset?.base64 ?? generatedBase64 : undefined;

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900 overflow-hidden">
      <div className="p-3 border-b border-white/10 flex items-center justify-between">
        <span className="text-sm font-semibold">{spec.label}</span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${URGENCY_STYLE[proposal.urgency]}`}>{URGENCY_LABEL[proposal.urgency]}</span>
      </div>
      <div className="p-3">
        <div className="text-[11px] text-white/40 mb-2">
          {proposal.hoursSinceLastPost === null ? "No posts yet on this platform" : `${Math.round(proposal.hoursSinceLastPost)}h since last post`}
        </div>

        {isVideoAsset && proposal.asset?.mediaUrl ? (
          <video src={proposal.asset.mediaUrl} controls className="w-full aspect-video rounded-lg mb-2 bg-black" />
        ) : previewImage ? (
          <img src={`data:image/jpeg;base64,${previewImage}`} alt="" className="w-full aspect-video object-cover rounded-lg mb-2" />
        ) : (
          <div className="w-full aspect-video rounded-lg bg-white/5 flex flex-col items-center justify-center gap-2 mb-2">
            <span className="text-xs text-white/40">Content library is empty — generate something new</span>
            <button type="button" onClick={generateNow} disabled={generating} className="text-xs font-medium rounded-lg border border-fuchsia-500/40 text-fuchsia-400 px-3 py-1.5 hover:bg-fuchsia-950/30 disabled:opacity-50">
              {generating ? "Generating…" : "✨ Generate an image"}
            </button>
          </div>
        )}
        {proposal.asset && <div className="text-[11px] text-white/40 mb-2">Repurposing: {proposal.asset.label}</div>}

        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} maxLength={spec.captionMaxChars} className="w-full rounded-lg border border-white/15 bg-transparent px-2.5 py-1.5 text-sm" />
        {proposal.hashtags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {proposal.hashtags.map((h) => (
              <span key={h} className="text-[11px] text-blue-400">#{h}</span>
            ))}
          </div>
        )}

        <div className="mt-2.5 flex items-center gap-2">
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="flex-1 rounded-lg border border-white/15 bg-transparent px-2.5 py-1.5 text-xs" />
          <button onClick={approve} disabled={saving} className="rounded-lg bg-white text-black text-xs font-semibold px-3 py-1.5 disabled:opacity-40">
            {saving ? "Scheduling…" : "Approve & schedule"}
          </button>
        </div>
        {error && <div className="mt-1.5 text-xs text-red-400">{error}</div>}
        {!spec.autoPublish && <div className="mt-1 text-[10px] text-white/40">No posting API yet for {spec.label} — this will queue as a manual-post reminder.</div>}
      </div>
    </div>
  );
}

export default function AdrienBrain() {
  const [proposals, setProposals] = useState<ContentProposal[] | null>(null);
  const [library, setLibrary] = useState<LibraryAsset[] | null>(null);
  const [brief, setBrief] = useState<BrandBrief>({ product: "" });
  const [briefSaving, setBriefSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [calendar, setCalendar] = useState<CalendarDay[] | null>(null);
  const [calendarSource, setCalendarSource] = useState<"ai" | "template" | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  async function loadPlan() {
    const res = await fetch("/api/content/plan");
    const data = await res.json();
    setProposals(data.proposals ?? []);
  }
  async function loadLibrary() {
    const res = await fetch("/api/content/library");
    const data = await res.json();
    setLibrary(data.assets ?? []);
  }
  async function loadBrief() {
    const res = await fetch("/api/content/brand");
    const data = await res.json();
    if (data.brief) setBrief(data.brief);
  }
  async function loadCalendar() {
    setCalendarLoading(true);
    try {
      const res = await fetch("/api/content/calendar");
      const data = await res.json();
      setCalendar(data.days ?? []);
      setCalendarSource(data.source ?? null);
    } finally {
      setCalendarLoading(false);
    }
  }

  useEffect(() => {
    loadPlan();
    loadLibrary();
    loadBrief();
    loadCalendar();
  }, []);

  async function saveBrief(e: React.FormEvent) {
    e.preventDefault();
    setBriefSaving(true);
    try {
      await fetch("/api/content/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief),
      });
      await loadPlan();
    } finally {
      setBriefSaving(false);
    }
  }

  async function addToLibrary(file: File) {
    setUploading(true);
    setLibraryError(null);
    try {
      const isVideo = file.type.startsWith("video/");
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/content/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, label: file.name, type: isVideo ? "video" : "image", contentType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) setLibraryError(data.error ?? "Failed to add to library");
      await loadLibrary();
    } finally {
      setUploading(false);
    }
  }

  async function removeFromLibrary(id: string) {
    await fetch(`/api/content/library?id=${id}`, { method: "DELETE" });
    await loadLibrary();
  }

  function handleScheduled(platform: string) {
    setProposals((prev) => (prev ? prev.filter((p) => p.platform !== platform) : prev));
    loadLibrary();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-8">
      <section className="mb-10 rounded-2xl border-2 border-violet-500/25 bg-violet-950/10 p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
          <h2 className="text-xl font-bold tracking-tight">Adrien Brain</h2>
        </div>
        <p className="text-sm text-white/50 mb-5">
          The rule: never go more than a day without posting on any platform, two at the absolute most. Adrien Brain watches the Scheduler, and the moment a platform is due, it proposes what to post — pulling from the content library first, generating something new when there's nothing left to repurpose.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
          <form onSubmit={saveBrief} className="lg:col-span-1 rounded-xl border border-white/10 bg-zinc-900 p-4">
            <div className="text-sm font-semibold mb-2">Brand brief</div>
            <p className="text-[11px] text-white/40 mb-3">What Adrien Brain generates captions and images from when it's proposing on its own.</p>
            <div className="space-y-2">
              <input value={brief.product} onChange={(e) => setBrief({ ...brief, product: e.target.value })} placeholder="Product / focus" className="w-full rounded-lg border border-white/15 bg-transparent px-2.5 py-1.5 text-sm" />
              <input value={brief.offer ?? ""} onChange={(e) => setBrief({ ...brief, offer: e.target.value })} placeholder="Offer (optional)" className="w-full rounded-lg border border-white/15 bg-transparent px-2.5 py-1.5 text-sm" />
              <input value={brief.tone ?? ""} onChange={(e) => setBrief({ ...brief, tone: e.target.value })} placeholder="Tone (optional)" className="w-full rounded-lg border border-white/15 bg-transparent px-2.5 py-1.5 text-sm" />
              <textarea value={brief.details ?? ""} onChange={(e) => setBrief({ ...brief, details: e.target.value })} placeholder="Extra details (optional)" rows={2} className="w-full rounded-lg border border-white/15 bg-transparent px-2.5 py-1.5 text-sm" />
            </div>
            <button type="submit" disabled={briefSaving || !brief.product} className="mt-2.5 w-full rounded-lg bg-violet-600 text-white text-xs font-medium py-1.5 hover:bg-violet-700 disabled:opacity-50">
              {briefSaving ? "Saving…" : "Save brief"}
            </button>
          </form>

          <div className="lg:col-span-2 rounded-xl border border-white/10 bg-zinc-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Content library ({library?.length ?? 0})</div>
              <label className="text-xs font-medium rounded-lg border border-violet-500/40 text-violet-400 px-3 py-1.5 hover:bg-violet-950/30 cursor-pointer">
                {uploading ? "Uploading…" : "+ Add photo or reel"}
                <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => e.target.files?.[0] && addToLibrary(e.target.files[0])} />
              </label>
            </div>
            <p className="text-[11px] text-white/40 mb-3">Reels and static shots to draw from before generating anything new. Video needs a Vercel Blob store connected (BLOB_READ_WRITE_TOKEN) — images always work.</p>
            {libraryError && <div className="text-xs text-red-400 mb-2">{libraryError}</div>}
            {library && library.length === 0 && <div className="text-xs text-white/30">Empty — add a few shots so Adrien Brain has something to repurpose.</div>}
            <div className="flex flex-wrap gap-2">
              {library?.map((a) => (
                <div key={a.id} className="relative w-16 h-16 rounded-lg overflow-hidden bg-white/5 group">
                  {a.type === "video" && a.mediaUrl ? (
                    <video src={a.mediaUrl} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={`data:image/jpeg;base64,${a.base64}`} alt="" className="w-full h-full object-cover" />
                  )}
                  {a.type === "video" && <div className="absolute top-0.5 left-0.5 text-[10px]">🎬</div>}
                  <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] text-center py-0.5">{a.timesUsed}×</div>
                  <button onClick={() => removeFromLibrary(a.id)} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white text-[10px] opacity-0 group-hover:opacity-100">×</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-sm font-semibold mb-2">Today&apos;s plan</div>
        {!proposals ? (
          <div className="text-sm text-white/40">Loading…</div>
        ) : proposals.length === 0 ? (
          <div className="text-sm text-emerald-400">Every platform is on schedule — nothing due right now.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {proposals.map((p) => (
              <ProposalCard key={p.platform} proposal={p} onScheduled={handleScheduled} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-8 mb-2">
          <div className="text-sm font-semibold">2-week idea calendar</div>
          <button onClick={loadCalendar} disabled={calendarLoading} className="text-xs font-medium rounded-lg border border-violet-500/40 text-violet-400 px-3 py-1.5 hover:bg-violet-950/30 disabled:opacity-50">
            {calendarLoading ? "Refreshing…" : "↻ Refresh"}
          </button>
        </div>
        <p className="text-[11px] text-white/40 mb-3">
          One flagship idea per day, adaptable across platforms — informed by real engagement/follower trends from Social Media Review where available, and general platform-trend knowledge where there's no live trends feed to pull from.
        </p>
        {!calendar ? (
          <div className="text-sm text-white/40">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {calendar.map((day) => (
              <div key={day.date} className="rounded-lg border border-white/10 bg-zinc-900 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold">{new Date(day.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${TONE_STYLE[day.tone]}`}>{day.tone}</span>
                </div>
                <div className="text-[10px] text-white/40 mb-1">{day.format === "reel" ? "🎬 Reel" : "🖼 Static"}</div>
                <div className="text-xs mb-1.5">{day.idea}</div>
                <div className="text-[10px] text-white/40">{day.reasoning}</div>
              </div>
            ))}
          </div>
        )}
        {calendarSource && (
          <div className="text-xs text-white/40 mt-3">
            {calendarSource === "ai" ? "Generated by AI from your performance data" : "Generated from templates (set ANTHROPIC_API_KEY for ideas informed by real performance data)"}
          </div>
        )}
      </section>
    </div>
  );
}
