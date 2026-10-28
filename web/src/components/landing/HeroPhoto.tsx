"use client";

import { DogGlyph } from "@/components/DogGlyph";
import { SamPhoto } from "@/components/SamPhoto";
import type { Outline } from "@/lib/sam/protocol";

export type HeroReading = {
  paint: string;
  ear: string;
  collar: string;
  reason: string;
  seconds: number;
};

type Props = {
  width: number;
  height: number;
  dog: Outline[];
  ear: { x: number; y: number } | null;
  reading: HeroReading;
  focus: { x: number; y: number };
  className?: string;
  priority?: boolean;
  /** Where the reading card sits relative to the ear, in CSS pixels. */
  cardOffset?: { x: number; y: number };
  showCard?: boolean;
};

export function ReadingCard({ reading, conf }: { reading: HeroReading; conf: number | null }) {
  return (
    <div className="float w-[19rem] rounded-[20px] bg-white p-4 text-[#0c1a28]">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <DogGlyph status="unmarked" size={30} />
          <span className="text-[1.05rem] font-semibold tracking-[-0.01em]">Dog 1</span>
        </span>
        <span className="text-[0.8125rem] text-[#6e7f91]">tracked{conf != null ? `, ${Math.round(conf * 100)}% sure` : ""}</span>
      </div>
      <dl className="mt-3 grid grid-cols-[6rem_1fr] gap-y-1 text-[0.9375rem]">
        <dt className="text-[#6e7f91]">Paint mark</dt>
        <dd>{reading.paint}</dd>
        <dt className="text-[#6e7f91]">Ear</dt>
        <dd>{reading.ear}</dd>
        <dt className="text-[#6e7f91]">Collar</dt>
        <dd>{reading.collar}</dd>
      </dl>
      <p className="mt-3 rounded-[12px] bg-[#f2f6f9] px-3 py-2.5 text-[0.875rem] leading-snug text-[#3d4f63]">{reading.reason}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="pill bg-[#e7eef3] text-[#0c1a28]">Not vaccinated</span>
        <span className="text-[0.8125rem] text-[#6e7f91]">read in {reading.seconds.toFixed(1)} s</span>
      </div>
    </div>
  );
}

export function HeroPhoto({ width, height, dog, ear, reading, focus, className, priority, cardOffset = { x: 70, y: -40 }, showCard = true }: Props) {
  const conf = dog[0]?.confidence ?? null;
  return (
    <SamPhoto
      src="/photos/lane-dawn-dog.jpg"
      alt="A black dog sits beside a lamp post on an empty village lane at dawn, the air gold with haze."
      width={width}
      height={height}
      outlines={dog}
      marks={[{ id: dog[0]?.id ?? "0", color: "#ffffff", label: showCard ? undefined : "Dog 1", detail: "not vaccinated" }]}
      focus={focus}
      priority={priority}
      delay={450}
      className={className}
      fillOpacity={0.12}
      renderOverlay={(project, drawn) => {
        if (!ear || !showCard) return null;
        const a = project(ear.x, ear.y);
        const card = { x: a.x + cardOffset.x, y: a.y + cardOffset.y };
        return (
          <>
            <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
              <line
                x1={a.x}
                y1={a.y}
                x2={card.x}
                y2={card.y + 26}
                stroke="#ffffff"
                strokeWidth={1.25}
                strokeOpacity={drawn ? 0.9 : 0}
                style={{ transition: "stroke-opacity 500ms var(--ease-out-quint) 1250ms" }}
              />
              <circle
                cx={a.x}
                cy={a.y}
                r={drawn ? 4.5 : 0}
                fill="#ffffff"
                style={{ transition: "r 400ms var(--ease-out-quint) 1150ms" }}
              />
            </svg>
            <div
              className="absolute"
              style={{
                left: card.x,
                top: card.y,
                opacity: drawn ? 1 : 0,
                transform: drawn ? "translateY(0)" : "translateY(8px)",
                transition: "opacity 600ms var(--ease-out-quint) 1400ms, transform 600ms var(--ease-out-quint) 1400ms",
              }}
            >
              <ReadingCard reading={reading} conf={conf} />
            </div>
          </>
        );
      }}
    />
  );
}
