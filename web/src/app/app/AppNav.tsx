"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/app", label: "Surveys", match: (p: string) => p === "/app" || p.startsWith("/app/walks") },
  { href: "/app/demo", label: "Sample survey", match: () => false },
];

export function AppNav() {
  const path = usePathname();
  return (
    <nav className="hidden items-center gap-1 text-[0.9375rem] sm:flex">
      {items.map((it) => {
        const on = it.match(path);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${on ? "bg-canvas-2 text-ink" : "text-ink-2 hover:text-ink"}`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
