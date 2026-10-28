import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/landing/Brand";
import { AppNav } from "./AppNav";

export const metadata: Metadata = { title: "Surveys" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-canvas">
      <header
        className="sticky z-30 border-b border-line bg-surface/90 backdrop-blur-md"
        style={{ top: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="shell flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link href="/" aria-label="Seventy home" className="rounded-md">
              <Wordmark />
            </Link>
            <AppNav />
          </div>
          <Link href="/app/new" className="btn btn-primary btn-sm">
            New survey
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
