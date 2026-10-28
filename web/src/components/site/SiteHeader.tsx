import Link from "next/link";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`display text-[1.6rem] leading-none tracking-[-0.02em] ${className}`}>
      Seventy
    </span>
  );
}

export function SiteHeader({ onPhoto = false }: { onPhoto?: boolean }) {
  const tone = onPhoto ? "text-[#1b1914]" : "text-ink";
  return (
    <header className={`relative z-20 ${tone}`}>
      <div className="shell flex h-16 items-center justify-between md:h-20">
        <Link href="/" aria-label="Seventy, home">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium md:gap-2">
          <a href="#how" className="hidden rounded-md px-3 py-2 hover:bg-black/5 sm:inline-block">
            How it works
          </a>
          <a href="#method" className="hidden rounded-md px-3 py-2 hover:bg-black/5 sm:inline-block">
            Method
          </a>
          <Link href="/app" className={`btn ml-2 h-10 px-4 text-sm ${onPhoto ? "btn-on-photo" : "btn-quiet"}`}>
            Open the app
          </Link>
        </nav>
      </div>
    </header>
  );
}
