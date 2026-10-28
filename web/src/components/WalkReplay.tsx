"use client";

import { SegmentationRenderer } from "@meta-sam/graphics";
import { createMediaPlayer, type IMediaPlayer } from "@meta-sam/video";
import { useEffect, useMemo, useRef, useState } from "react";
import { parseVideoText } from "@/lib/sam/protocol";
import { clock } from "@/lib/format";

export type ReplayChunk = { idx: number; startS: number; video: string; sam: string };
export type ReplayDog = { label: number; status: string; segments: { chunk: number; objectId: string }[] };

const COLOR: Record<string, string> = {
  marked: "#e0562e",
  unmarked: "#f4efe5",
  unknown: "#b5ab9a",
  not_a_dog: "#7a7365",
  duplicate: "#7a7365",
};

/**
 * Rewrite chunk-local SAM object ids to the walk's dog numbers, so the
 * renderer's own labels read "Dog 7". Tracks that were dropped as noise get
 * ids from 10000 up and are hidden.
 */
function remapIds(text: string, map: Map<string, number>): { text: string; hidden: Set<string> } {
  const hidden = new Set<string>();
  const out = text.replace(/(<\d+f>|,)(\d+)(?=<\|box)/g, (_m, lead: string, id: string) => {
    const label = map.get(id);
    if (label != null) return `${lead}${label}`;
    const ghost = String(10000 + Number(id));
    hidden.add(ghost);
    return `${lead}${ghost}`;
  });
  return { text: out, hidden };
}

export function WalkReplay({ chunks, dogs }: { chunks: ReplayChunk[]; dogs: ReplayDog[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<IMediaPlayer | null>(null);
  const rendererRef = useRef<SegmentationRenderer | null>(null);
  const hiddenRef = useRef<Set<string>>(new Set());
  const dprRef = useRef(1);
  const [active, setActive] = useState(chunks[0]?.idx ?? 0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusByLabel = useMemo(() => new Map(dogs.map((d) => [String(d.label), d.status])), [dogs]);
  const chunk = chunks.find((c) => c.idx === active) ?? chunks[0];

  // One player and one renderer for the component's lifetime.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new SegmentationRenderer({
      objectColor: (id) => COLOR[statusByLabel.get(id) ?? "unknown"] ?? COLOR.unknown,
      maskFillOpacity: 0.3,
      maskOutline: { opacity: 0.95 },
      boxLabels: true,
    });
    const player = createMediaPlayer(canvas);
    player.setCustomRender((ctx) => {
      renderer.renderVideoFrame(ctx, { fit: "contain", devicePixelRatio: () => dprRef.current, hiddenIds: hiddenRef.current, boxLabel: "Dog" });
    });
    const offs = [
      player.on("timeupdate", ({ time }) => setTime(time)),
      player.on("play", () => setPlaying(true)),
      player.on("pause", () => setPlaying(false)),
      player.on("ended", () => setPlaying(false)),
      player.on("error", ({ error }) => setError(error instanceof Error ? error.message : String(error))),
    ];
    playerRef.current = player;
    rendererRef.current = renderer;

    const wrap = wrapRef.current!;
    const resize = () => {
      dprRef.current = window.devicePixelRatio || 1;
      const w = wrap.clientWidth;
      const h = Math.round((w * 9) / 16);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.round(w * dprRef.current);
      canvas.height = Math.round(h * dprRef.current);
      player.forceRender().catch(() => {});
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => {
      ro.disconnect();
      offs.forEach((off) => off());
      player.dispose();
      renderer.dispose();
      playerRef.current = null;
      rendererRef.current = null;
    };
    // statusByLabel is read through the colour callback; the player is created once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the selected minute: its video and its SAM output.
  useEffect(() => {
    if (!chunk) return;
    let cancelled = false;
    const player = playerRef.current;
    const renderer = rendererRef.current;
    if (!player || !renderer) return;
    setReady(false);
    setError(null);
    (async () => {
      try {
        const map = new Map<string, number>();
        for (const d of dogs) for (const s of d.segments) if (s.chunk === chunk.idx) map.set(s.objectId, d.label);
        const raw = await fetch(chunk.sam).then((r) => {
          if (!r.ok) throw new Error("The tracking output for this minute is missing.");
          return r.text();
        });
        const { text, hidden } = remapIds(raw, map);
        const result = await parseVideoText(text);
        if (cancelled) return;
        hiddenRef.current = hidden;
        await renderer.update(result, { reset: true });
        await player.open(chunk.video);
        if (cancelled) return;
        setReady(true);
        setTime(0);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "This minute couldn’t be loaded.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chunk, dogs]);

  async function toggle() {
    const p = playerRef.current;
    if (!p) return;
    if (p.paused) await p.play().catch(() => {});
    else p.pause();
  }

  return (
    <div>
      <div ref={wrapRef} className="relative overflow-hidden rounded-[8px] bg-[#0f0e0c]">
        <canvas ref={canvasRef} className="block" aria-label="Walk video with each dog outlined by SAM 3.1" />
        {!ready && !error && <p className="label absolute inset-0 flex items-center justify-center text-[#efe7d8]/70">Loading minute {active + 1}</p>}
        {error && <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-[#efe7d8]">{error}</p>}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={toggle} disabled={!ready} className="btn btn-quiet h-9 px-4 text-sm disabled:opacity-40">
            {playing ? "Pause" : "Play"}
          </button>
          <span className="num text-sm text-ink-2">{clock((chunk?.startS ?? 0) + time)} into the walk</span>
        </div>
        {chunks.length > 1 && (
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Minute of the walk">
            {chunks.map((c) => (
              <button
                key={c.idx}
                type="button"
                role="tab"
                aria-selected={c.idx === active}
                onClick={() => setActive(c.idx)}
                className={`num h-8 min-w-8 rounded-[6px] border px-2 text-xs transition-colors ${c.idx === active ? "border-ink bg-ink text-paper" : "border-line-strong hover:border-ink"}`}
              >
                {c.idx + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
