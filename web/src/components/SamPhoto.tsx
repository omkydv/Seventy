"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Outline } from "@/lib/sam/protocol";

export type PhotoMark = {
  id: string;
  /** Outline colour for this object; defaults to a near-white. */
  color?: string;
  label?: string;
  /** Muted text after the label, shown instead of the confidence. */
  detail?: string;
};

/** Maps a point in image pixels to a point in the container, in CSS pixels. */
export type Project = (x: number, y: number) => { x: number; y: number };

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  outlines: Outline[];
  marks?: PhotoMark[];
  /** object-position for the cover crop, as fractions. */
  focus?: { x: number; y: number };
  priority?: boolean;
  sizes?: string;
  className?: string;
  /** Delay before the outlines draw in, in ms. */
  delay?: number;
  /** Draw when scrolled into view rather than on mount. */
  drawOnView?: boolean;
  showLabels?: boolean;
  fillOpacity?: number;
  /** Extra layers positioned in image coordinates, such as annotations. */
  renderOverlay?: (project: Project, drawn: boolean) => ReactNode;
  children?: ReactNode;
};

type Fit = { x: number; y: number; w: number; h: number };

const useIsoLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function SamPhoto({
  src,
  alt,
  width,
  height,
  outlines,
  marks = [],
  focus = { x: 0.5, y: 0.5 },
  priority,
  sizes = "100vw",
  className = "relative",
  delay = 300,
  drawOnView = false,
  showLabels = true,
  fillOpacity = 0.1,
  renderOverlay,
  children,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Fit | null>(null);
  const [drawn, setDrawn] = useState(false);

  useIsoLayout(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const scale = Math.max(cw / width, ch / height);
      const w = width * scale;
      const h = height * scale;
      setFit({ x: (cw - w) * focus.x, y: (ch - h) * focus.y, w, h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height, focus.x, focus.y]);

  useEffect(() => {
    if (!fit || drawn) return;
    const start = () => window.setTimeout(() => setDrawn(true), delay);
    if (!drawOnView) {
      const t = start();
      return () => window.clearTimeout(t);
    }
    const el = ref.current;
    if (!el) return;
    let t: number | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          t = start();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (t) window.clearTimeout(t);
    };
  }, [fit, drawn, delay, drawOnView]);

  const markById = new Map(marks.map((m) => [m.id, m]));
  const project: Project = (x, y) => (fit ? { x: fit.x + (x / width) * fit.w, y: fit.y + (y / height) * fit.h } : { x: 0, y: 0 });

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover"
        style={{ objectPosition: `${focus.x * 100}% ${focus.y * 100}%` }}
      />
      {fit && (
        <div className="pointer-events-none absolute" style={{ left: fit.x, top: fit.y, width: fit.w, height: fit.h }} aria-hidden>
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            {outlines.map((o, i) => {
              const color = markById.get(o.id)?.color ?? "#f7fbff";
              const sx = (o.box.right - o.box.left) / o.rasterWidth;
              const sy = (o.box.bottom - o.box.top) / o.rasterHeight;
              return (
                <g key={o.id} transform={`translate(${o.box.left} ${o.box.top}) scale(${sx} ${sy})`}>
                  <path
                    d={o.path}
                    fill={color}
                    fillRule="evenodd"
                    style={{
                      fillOpacity: drawn ? fillOpacity : 0,
                      transition: `fill-opacity 900ms var(--ease-out-quint) ${700 + i * 240}ms`,
                    }}
                  />
                  <path
                    d={o.path}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.75}
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                    pathLength={1}
                    style={{
                      strokeDasharray: 1,
                      strokeDashoffset: drawn ? 0 : 1,
                      transition: `stroke-dashoffset 1300ms var(--ease-out-quint) ${i * 240}ms`,
                    }}
                  />
                </g>
              );
            })}
          </svg>
          {showLabels &&
            outlines.map((o, i) => {
              const mark = markById.get(o.id);
              if (!mark?.label) return null;
              return (
                <span
                  key={o.id}
                  className="absolute whitespace-nowrap rounded-full bg-white/92 px-2.5 py-1 text-[0.8125rem] font-semibold text-[#0c1a28] shadow-[0_6px_18px_-8px_rgb(12_26_40/0.5)]"
                  style={{
                    left: `${(o.anchor.x / width) * 100}%`,
                    top: `${(o.anchor.y / height) * 100}%`,
                    opacity: drawn ? 1 : 0,
                    transform: `translate(-50%, ${drawn ? "calc(-100% - 10px)" : "calc(-100% - 4px)"})`,
                    transition: `opacity 420ms var(--ease-out-quint) ${1000 + i * 240}ms, transform 420ms var(--ease-out-quint) ${1000 + i * 240}ms`,
                  }}
                >
                  {mark.label}
                  {mark.detail ? (
                    <span className="ml-1.5 font-medium text-[#6e7f91]">{mark.detail}</span>
                  ) : (
                    o.confidence != null && <span className="ml-1.5 font-medium text-[#6e7f91]">{o.confidence.toFixed(2)}</span>
                  )}
                </span>
              );
            })}
        </div>
      )}
      {fit && renderOverlay && <div className="pointer-events-none absolute inset-0">{renderOverlay(project, drawn)}</div>}
      {children}
    </div>
  );
}
