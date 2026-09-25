"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Dashboard" },
  { href: "/creative-factory", label: "Creative Factory" },
  { href: "/content-studio", label: "Content Studio" },
  { href: "/adrien-brain", label: "Adrien Brain" },
  { href: "/scheduler", label: "Scheduler" },
];

const HERO_COPY: Record<string, { eyebrow: string; heading: [string, string]; body: string }> = {
  "/": {
    eyebrow: "Dashboard",
    heading: ["Every channel.", "One view."],
    body: "Sales, ads, and social — pulled live from Meta, Google, and Bite, in one place, updated in real time.",
  },
  "/creative-factory": {
    eyebrow: "Creative Factory",
    heading: ["Idea to launch.", "In minutes."],
    body: "AI-written copy, full campaign builds for Meta and Google — always paused until you say go.",
  },
  "/content-studio": {
    eyebrow: "Content Studio",
    heading: ["One upload.", "Every platform."],
    body: "Repurpose a photo or video — or start from nothing — into captions and crops built for Meta, YouTube, LinkedIn, TikTok, and X.",
  },
  "/adrien-brain": {
    eyebrow: "Adrien Brain",
    heading: ["Never miss", "a day."],
    body: "One day without posting, two at the absolute most. Adrien Brain watches every platform and proposes what to post before that ever happens.",
  },
  "/scheduler": {
    eyebrow: "Scheduler",
    heading: ["Queue it.", "Forget it."],
    body: "Everything you've scheduled, across every platform, in one queue — Meta posts itself, the rest remind you.",
  },
};

export default function AppHeader() {
  const pathname = usePathname();
  const hero = HERO_COPY[pathname] ?? HERO_COPY["/"];

  return (
    <div className="relative overflow-hidden bg-black text-white">
      {/* Ambient glow + diagonal line texture, matching a dark agency-site hero */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 900px 600px at 30% 15%, rgba(124,58,237,0.35), transparent 60%), radial-gradient(ellipse 700px 500px at 55% 30%, rgba(59,130,246,0.25), transparent 65%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, transparent 0 38px, rgba(255,255,255,0.5) 38px 39px)",
        }}
      />

      <div className="relative">
        {/* Nav pill */}
        <div className="flex justify-center pt-6 px-4">
          <nav className="flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] backdrop-blur-md px-2 py-2 shadow-lg shadow-black/30">
            <span className="pl-3 pr-4 text-base font-bold tracking-tight lowercase">adrien</span>
            {TABS.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-3.5 py-1.5 text-sm rounded-full transition ${
                    active ? "bg-white text-black font-medium" : "text-white/70 hover:text-white"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Hero */}
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-20">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-4">{hero.eyebrow}</div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
            {hero.heading[0]}
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/40">
              {hero.heading[1]}
            </span>
          </h1>
          <p className="mt-5 max-w-md text-sm md:text-base text-white/60">{hero.body}</p>
        </div>
      </div>
    </div>
  );
}
