"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Outline } from "@/lib/sam/protocol";

export type PhotoMark = {
  id: string;
  /** Colour for this object's outline; defaults to the paper tone. */
  color?: string;
  label?: string;
  sublabel?: string;
};

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
  children?: ReactNode;
  showLabels?: boolean;
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
  children,
  showLabels = true,
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
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (t) window.clearTimeout(t);
    };
  }, [fit, drawn, delay, drawOnView]);

  const markById = new Map(marks.map((m) => [m.id, m]));

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
        <div
          className="pointer-events-none absolute"
          style={{ left: fit.x, top: fit.y, width: fit.w, height: fit.h }}
          aria-hidden
        >
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            {outlines.map((o, i) => {
              const mark = markById.get(o.id);
              const color = mark?.color ?? "#f6f0e4";
              const sx = (o.box.right - o.box.left) / o.rasterWidth;
              const sy = (o.box.bottom - o.box.top) / o.rasterHeight;
              return (
                <g key={o.id} transform={`translate(${o.box.left} ${o.box.top}) scale(${sx} ${sy})`}>
                  <path
                    d={o.path}
                    fill={color}
                    fillRule="evenodd"
                    style={{
                      fillOpacity: drawn ? 0.09 : 0,
                      transition: `fill-opacity 900ms var(--ease-out-field) ${600 + i * 260}ms`,
                    }}
                  />
                  <path
                    d={o.path}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.6}
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                    pathLength={1}
                    style={{
                      strokeDasharray: 1,
                      strokeDashoffset: drawn ? 0 : 1,
                      transition: `stroke-dashoffset 1100ms var(--ease-out-field) ${i * 260}ms`,
                    }}
                  />
                </g>
              );
            })}
          </svg>
          {showLabels &&
            outlines.map((o, i) => {
              const mark = markById.get(o.id);
              if (mark && !mark.label) return null;
              const left = (o.anchor.x / width) * 100;
              const top = (o.anchor.y / height) * 100;
              return (
                <div
                  key={o.id}
                  className="absolute pb-2"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    opacity: drawn ? 1 : 0,
                    transform: `translate(-50%, ${drawn ? "-100%" : "calc(-100% + 4px)"})`,
                    transition: `opacity 400ms var(--ease-out-field) ${900 + i * 260}ms, transform 400ms var(--ease-out-field) ${900 + i * 260}ms`,
                  }}
                >
                  <span className="label whitespace-nowrap rounded-[3px] bg-[rgb(20_18_14/0.62)] px-1.5 py-0.5 text-[#f6f0e4] backdrop-blur-sm">
                    {mark?.label ?? `Dog ${String(Number(o.id) + 1).padStart(2, "0")}`}
                    {o.confidence != null && <span className="opacity-70"> · {o.confidence.toFixed(2)}</span>}
                  </span>
                  {mark?.sublabel && (
                    <span className="label mt-1 block whitespace-nowrap text-[#f6f0e4]/80">{mark.sublabel}</span>
                  )}
                </div>
              );
            })}
        </div>
      )}
      {children}
    </div>
  );
}
