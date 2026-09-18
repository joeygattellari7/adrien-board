"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Dashboard" },
  { href: "/creative-factory", label: "Creative Factory" },
];

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <div className="max-w-6xl mx-auto px-4 pt-8">
      <div className="relative mb-8 rounded-2xl bg-zinc-200 dark:bg-zinc-800 px-6 py-8">
        {/* TODO: swap for the actual G8 Media logo image once provided */}
        <div className="absolute top-4 right-6 text-sm font-semibold text-black/40 dark:text-white/40">
          G8 Media
        </div>
        <h1 className="text-center text-4xl font-extrabold tracking-tight text-black dark:text-white">ADRIEN</h1>
      </div>
      <header className="mb-6">
        <p className="text-sm font-medium">Client: Juliano Pizzaria</p>
        <p className="text-sm text-black/50 dark:text-white/50">Real-time performance dashboard</p>
      </header>
      <nav className="flex gap-1 rounded-lg border border-black/10 dark:border-white/10 p-1 mb-8 w-fit">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3 py-1.5 text-sm rounded-md transition ${
                active
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
