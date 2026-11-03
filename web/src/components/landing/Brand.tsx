import Link from "next/link";
import { DOG_PATH } from "@/components/DogGlyph";

/** Wordmark: the name, set wide, with one marked dog. */
export function Wordmark({ className = "", tone = "ink" }: { className?: string; tone?: "ink" | "light" }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 36 24" width={26} height={17.3} aria-hidden>
        <path d={DOG_PATH} fill="var(--mark)" />
      </svg>
      <span
        className={`text-[1.3rem] font-[640] leading-none tracking-[-0.03em] ${tone === "light" ? "text-white" : "text-ink"}`}
        style={{ fontStretch: "115%" }}
      >
        Seventy
      </span>
    </span>
  );
}

export function LandingHeader() {
  return (
    <header className="relative z-20">
      <div className="shell flex h-[72px] items-center justify-between">
        <Link href="/" aria-label="Seventy home" className="rounded-md">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-1 text-[0.9375rem] font-medium text-ink">
          <a href="#problem" className="hidden rounded-lg px-3 py-2 hover:bg-black/5 lg:inline-block">
            The problem
          </a>
          <a href="#how" className="hidden rounded-lg px-3 py-2 hover:bg-black/5 md:inline-block">
            How it works
          </a>
          <a href="#field" className="hidden rounded-lg px-3 py-2 hover:bg-black/5 lg:inline-block">
            In the field
          </a>
          <a href="#proof" className="hidden rounded-lg px-3 py-2 hover:bg-black/5 md:inline-block">
            Proof
          </a>
          <a href="#evidence" className="hidden rounded-lg px-3 py-2 hover:bg-black/5 lg:inline-block">
            Built on Meta
          </a>
          <Link href="/app" className="btn btn-primary btn-sm ml-3">
            Open the app
          </Link>
        </nav>
      </div>
    </header>
  );
}
