import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/landing/Brand";

export const metadata: Metadata = { title: "Walks" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-sm" style={{ top: "env(safe-area-inset-top, 0px)" }}>
        <div className="shell flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" aria-label="Seventy, home">
              <Wordmark className="text-[1.35rem]" />
            </Link>
            <nav className="hidden items-center gap-1 text-sm sm:flex">
              <Link href="/app" className="rounded-md px-3 py-1.5 text-ink-2 hover:bg-paper-2 hover:text-ink">
                Walks
              </Link>
              <Link href="/app/demo" className="rounded-md px-3 py-1.5 text-ink-2 hover:bg-paper-2 hover:text-ink">
                Sample survey
              </Link>
            </nav>
          </div>
          <Link href="/app/new" className="btn btn-primary h-9 px-4 text-sm">
            New walk
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
