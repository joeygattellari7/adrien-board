"use client";

import { useEffect, useState } from "react";
import { PLATFORM_SPECS } from "@/lib/content/platforms";
import { ScheduledPost } from "@/lib/content/scheduler";

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  published: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  needs_manual_post: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  published: "Published",
  needs_manual_post: "Needs manual post",
  failed: "Failed",
};

export default function Scheduler() {
  const [posts, setPosts] = useState<ScheduledPost[] | null>(null);
  const [backend, setBackend] = useState<"redis" | "memory" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/content/schedule");
    const data = await res.json();
    setPosts(data.posts ?? []);
    setBackend(data.backend ?? null);
  }

  useEffect(() => {
    load();
  }, []);

  async function cancel(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/content/schedule?id=${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function markPosted(id: string) {
    setBusyId(id);
    try {
      await fetch("/api/content/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "published" }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-8">
      <section className="mb-10 rounded-2xl border-2 border-cyan-500/25 bg-cyan-950/10 p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
          <h2 className="text-xl font-bold tracking-tight">Scheduler</h2>
        </div>
        <p className="text-sm text-white/50 mb-2">
          Everything queued from Content Studio. Meta posts automatically when due; every other platform surfaces here as a reminder to post manually until its own posting API is connected.
        </p>
        {backend === "memory" && (
          <div className="mb-5 rounded-lg border border-amber-500/30 bg-amber-950/20 text-amber-400 text-xs p-3">
            Running on in-memory storage — this queue won&apos;t survive a server restart or cold start. Set <code>UPSTASH_REDIS_REST_URL</code> and <code>UPSTASH_REDIS_REST_TOKEN</code> (a Vercel Marketplace Redis integration) for a persistent queue.
          </div>
        )}

        {!posts ? (
          <div className="text-sm text-white/40">Loading…</div>
        ) : posts.length === 0 ? (
          <div className="text-sm text-white/40">Nothing queued yet — generate content in Content Studio and schedule it.</div>
        ) : (
          <div className="space-y-2">
            {posts.map((p) => (
              <div key={p.id} className="rounded-xl border border-white/10 bg-zinc-900 p-3 flex items-center gap-3">
                {p.mediaType === "image" && p.mediaBase64 && (
                  <img src={`data:image/jpeg;base64,${p.mediaBase64}`} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold">{PLATFORM_SPECS[p.platform].label}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                  </div>
                  <div className="text-xs text-white/50 truncate">{p.caption}</div>
                  <div className="text-[11px] text-white/30 mt-0.5">{new Date(p.scheduledFor).toLocaleString()}</div>
                  {p.error && <div className="text-[11px] text-red-400 mt-0.5">{p.error}</div>}
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {(p.status === "needs_manual_post" || p.status === "failed") && (
                    <button onClick={() => markPosted(p.id)} disabled={busyId === p.id} className="text-xs rounded-lg bg-white text-black font-medium px-2.5 py-1 disabled:opacity-40">
                      Mark posted
                    </button>
                  )}
                  {p.status !== "published" && (
                    <button onClick={() => cancel(p.id)} disabled={busyId === p.id} className="text-xs rounded-lg border border-white/15 px-2.5 py-1 hover:bg-white/10 disabled:opacity-40">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
