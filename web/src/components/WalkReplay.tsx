"use client";

import { SegmentationRenderer, type VideoFrameCompositionContext } from "@meta-sam/graphics";
import { frameIndexOf, recordsOfKind } from "@meta-sam/parser";
import { createMediaPlayer, type IMediaPlayer } from "@meta-sam/video";
import { useEffect, useRef, useState } from "react";
import { parseVideoText } from "@/lib/sam/protocol";
import { clock } from "@/lib/format";

export type ReplayChunk = { idx: number; startS: number; video: string; sam: string };
export type ReplayDog = { label: number; status: string; segments: { chunk: number; objectId: string }[] };

/** Overlay colour per reading, and the label text drawn on it. */
const COLOR: Record<string, { fill: string; text: string }> = {
  marked: { fill: "#12a85f", text: "#ffffff" },
  unmarked: { fill: "#f4f8fb", text: "#0c1a28" },
  unknown: { fill: "#9aabbb", text: "#0c1a28" },
  not_a_dog: { fill: "#6e7f91", text: "#ffffff" },
  duplicate: { fill: "#6e7f91", text: "#ffffff" },
};
const colorOf = (status: string | undefined) => COLOR[status ?? "unknown"] ?? COLOR.unknown;

type LabelBox = { id: string; left: number; top: number };

/**
 * Rewrite chunk-local SAM object ids to the walk's dog numbers. Tracks that
 * were dropped as noise get ids from 10000 up and are hidden.
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
  const labelsRef = useRef<Map<number, LabelBox[]>>(new Map());
  const sourceRef = useRef({ w: 960, h: 540 });
  const statusRef = useRef<Map<string, string>>(new Map());
  const dprRef = useRef(1);
  const [active, setActive] = useState(chunks[0]?.idx ?? 0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chunk = chunks.find((c) => c.idx === active) ?? chunks[0];

  // Colours follow the readings, including a person's review.
  useEffect(() => {
    statusRef.current = new Map(dogs.map((d) => [String(d.label), d.status]));
    playerRef.current?.forceRender().catch(() => {});
  }, [dogs]);

  // One player and one renderer for the component's lifetime.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new SegmentationRenderer({
      objectColor: (id) => colorOf(statusRef.current.get(id)).fill,
      maskFillOpacity: 0.22,
      maskOutline: { opacity: 0.95 },
    });

    // Labels are drawn here rather than by the renderer, which prints the raw detection score.
    const drawLabels = (c: VideoFrameCompositionContext) => {
      const boxes = labelsRef.current.get(c.frameIndex);
      if (!boxes?.length) return;
      const dpr = dprRef.current;
      const { w: sw, h: sh } = sourceRef.current;
      const scale = Math.min(c.canvas.width / sw, c.canvas.height / sh);
      const ox = (c.canvas.width - sw * scale) / 2;
      const oy = (c.canvas.height - sh * scale) / 2;
      const ctx = c.ctx;
      const h = 24 * dpr;
      const pad = 9 * dpr;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = `600 ${13 * dpr}px "Mona Sans", ui-sans-serif, system-ui, sans-serif`;
      ctx.textBaseline = "middle";
      for (const b of boxes) {
        if (hiddenRef.current.has(b.id)) continue;
        const color = colorOf(statusRef.current.get(b.id));
        const text = `Dog ${b.id}`;
        const w = ctx.measureText(text).width + pad * 2;
        const x = Math.min(ox + b.left * scale, c.canvas.width - w - 4 * dpr);
        const above = oy + b.top * scale - h - 6 * dpr;
        const y = above > 4 * dpr ? above : oy + b.top * scale + 6 * dpr;
        ctx.fillStyle = color.fill;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, h / 2);
        ctx.fill();
        ctx.fillStyle = color.text;
        ctx.fillText(text, x + pad, y + h / 2 + dpr);
      }
      ctx.restore();
    };

    const player = createMediaPlayer(canvas);
    player.setCustomRender((c) => {
      renderer.renderVideoFrame(c, { fit: "contain", devicePixelRatio: () => dprRef.current, hiddenIds: hiddenRef.current });
      drawLabels(c);
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
  }, []);

  // Load the selected piece: its video and its SAM output.
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
          if (!r.ok) throw new Error("The tracking output for this piece is missing.");
          return r.text();
        });
        const { text, hidden } = remapIds(raw, map);
        const result = await parseVideoText(text);
        if (cancelled) return;
        const size = raw.match(/;w=(\d+);h=(\d+)/);
        if (size) sourceRef.current = { w: Number(size[1]), h: Number(size[2]) };
        const labels = new Map<number, LabelBox[]>();
        for (const b of recordsOfKind(result.records, "box")) {
          const f = frameIndexOf(b);
          if (f == null) continue;
          const list = labels.get(f) ?? [];
          list.push({ id: b.objectId, left: b.left, top: b.top });
          labels.set(f, list);
        }
        labelsRef.current = labels;
        hiddenRef.current = hidden;
        await renderer.update(result, { reset: true });
        await player.open(chunk.video);
        if (cancelled) return;
        setReady(true);
        setTime(0);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "This piece couldn’t be loaded.");
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
      <div ref={wrapRef} className="relative overflow-hidden rounded-[24px] bg-[#08121c]">
        <canvas ref={canvasRef} className="block" aria-label="Walk video with each dog outlined by SAM 3.1" />
        {!ready && !error && <p className="absolute inset-0 flex items-center justify-center text-[0.9375rem] text-white/70">Loading the video</p>}
        {error && <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-[0.9375rem] text-white">{error}</p>}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={toggle} disabled={!ready} className="btn btn-primary btn-sm min-w-[5.5rem] disabled:opacity-40">
            {playing ? "Pause" : "Play"}
          </button>
          <span className="num text-[0.9375rem] text-ink-2">{clock((chunk?.startS ?? 0) + time)} into the walk</span>
        </div>
        {chunks.length > 1 && (
          <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Part of the walk">
            <span className="mr-2 text-[0.875rem] text-ink-3">Part</span>
            {chunks.map((c) => (
              <button
                key={c.idx}
                type="button"
                role="tab"
                aria-selected={c.idx === active}
                onClick={() => setActive(c.idx)}
                className={`num h-9 min-w-9 rounded-[10px] px-2 text-[0.8125rem] font-semibold transition-colors ${c.idx === active ? "bg-ink text-on-ink" : "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] hover:shadow-[inset_0_0_0_1px_var(--ink-3)]"}`}
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
