"use client";

import { SegmentationRenderer, type VideoFrameCompositionContext } from "@meta-sam/graphics";
import { decodeMaskToSVGPath, frameIndexOf, recordsOfKind, type SegmentationMask } from "@meta-sam/parser";
import { createMediaPlayer, type IMediaPlayer } from "@meta-sam/video";
import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from "react";
import { parseVideoText } from "@/lib/sam/protocol";
import { clock } from "@/lib/format";

export type ReplayChunk = { idx: number; startS: number; video: string; sam: string; people?: string | null };
export type ReplayDog = { label: number; status: string; segments: { chunk: number; objectId: string }[] };
export type ReplayHandle = { seek: (walkSeconds: number) => void; play: () => Promise<void> };

/** Overlay colour per reading, and the label text drawn on it. */
const COLOR: Record<string, { fill: string; text: string }> = {
  marked: { fill: "#12a85f", text: "#ffffff" },
  unmarked: { fill: "#f4f8fb", text: "#0c1a28" },
  counted: { fill: "#f4f8fb", text: "#0c1a28" },
  unknown: { fill: "#9aabbb", text: "#0c1a28" },
  not_a_dog: { fill: "#6e7f91", text: "#ffffff" },
  duplicate: { fill: "#6e7f91", text: "#ffffff" },
};
const colorOf = (status: string | undefined) => COLOR[status ?? "unknown"] ?? COLOR.unknown;

type Box = { id: string; left: number; top: number; right: number; bottom: number };
/** A person SAM found, with the outline we blur inside. */
type Person = Box & { mask?: SegmentationMask; bounds?: { left: number; top: number; right: number; bottom: number }; path?: Path2D | null };

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

async function boxesByFrame(text: string): Promise<Map<number, Box[]>> {
  const result = await parseVideoText(text);
  const out = new Map<number, Box[]>();
  for (const b of recordsOfKind(result.records, "box")) {
    const f = frameIndexOf(b);
    if (f == null) continue;
    const list = out.get(f) ?? [];
    list.push({ id: b.objectId, left: b.left, top: b.top, right: b.right, bottom: b.bottom });
    out.set(f, list);
  }
  return out;
}

async function peopleByFrame(text: string): Promise<Map<number, Person[]>> {
  const result = await parseVideoText(text);
  const out = new Map<number, Person[]>();
  const at = (f: number, id: string) => {
    const list = out.get(f) ?? [];
    let p = list.find((x) => x.id === id);
    if (!p) {
      p = { id, left: 0, top: 0, right: 0, bottom: 0 };
      list.push(p);
      out.set(f, list);
    }
    return p;
  };
  for (const b of recordsOfKind(result.records, "box")) {
    const f = frameIndexOf(b);
    if (f == null) continue;
    Object.assign(at(f, b.objectId), { left: b.left, top: b.top, right: b.right, bottom: b.bottom });
  }
  for (const m of recordsOfKind(result.records, "mask")) {
    const f = frameIndexOf(m);
    if (f == null) continue;
    const p = at(f, m.objectId);
    p.mask = m.mask;
    p.bounds = m.bounds;
    if (!p.right) Object.assign(p, m.bounds);
  }
  return out;
}

type Props = {
  chunks: ReplayChunk[];
  dogs: ReplayDog[];
  /** Width over height of the frame on screen; by default the tracked video's, so portrait and wide walks both fit. */
  aspect?: number;
  /** The frame's shape below 640 px wide, when it differs. */
  narrowAspect?: number;
  /** "cover" fills a frame of another shape by trimming the video's edges evenly. */
  fit?: "contain" | "cover";
  /** The frame never gets taller than this share of the screen. */
  maxVh?: number;
  /** A dog to ring in white, by its number on the walk. */
  selected?: number | null;
  onTime?: (walkSeconds: number) => void;
  autoPlay?: boolean;
  loop?: boolean;
  controls?: boolean;
  rounded?: string;
  /** A still of the first frame, shown until the video can draw. */
  poster?: string;
  /** Called once the first piece can play. */
  onReady?: () => void;
  ref?: Ref<ReplayHandle>;
};

export function WalkReplay({
  chunks,
  dogs,
  aspect = 16 / 9,
  narrowAspect,
  fit = "contain",
  maxVh = 0.72,
  selected = null,
  onTime,
  autoPlay = false,
  loop = false,
  controls = true,
  rounded = "rounded-[24px]",
  poster,
  onReady,
  ref,
}: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<IMediaPlayer | null>(null);
  const rendererRef = useRef<SegmentationRenderer | null>(null);
  const hiddenRef = useRef<Set<string>>(new Set());
  const labelsRef = useRef<Map<number, Box[]>>(new Map());
  const peopleRef = useRef<Map<number, Person[]>>(new Map());
  const sourceRef = useRef({ w: 960, h: 540 });
  const statusRef = useRef<Map<string, string>>(new Map());
  const selectedRef = useRef<number | null>(selected);
  const pendingSeekRef = useRef<number | null>(null);
  const onTimeRef = useRef(onTime);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  const dprRef = useRef(1);
  const openedRef = useRef(false);
  const [active, setActive] = useState(chunks[0]?.idx ?? 0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chunk = chunks.find((c) => c.idx === active) ?? chunks[0];
  const chunkRef = useRef(chunk);

  useEffect(() => {
    onTimeRef.current = onTime;
    chunkRef.current = chunk;
  });

  // Colours follow the readings, including a person's review.
  useEffect(() => {
    statusRef.current = new Map(dogs.map((d) => [String(d.label), d.status]));
    playerRef.current?.forceRender().catch(() => {});
  }, [dogs]);

  useEffect(() => {
    selectedRef.current = selected;
    playerRef.current?.forceRender().catch(() => {});
  }, [selected]);

  useImperativeHandle(ref, () => ({
    seek(walkSeconds: number) {
      const target = [...chunks].reverse().find((c) => walkSeconds >= c.startS) ?? chunks[0];
      if (!target) return;
      if (target.idx !== chunkRef.current?.idx) {
        pendingSeekRef.current = walkSeconds - target.startS;
        setActive(target.idx);
      } else {
        playerRef.current?.seek(Math.max(0, walkSeconds - target.startS)).catch(() => {});
      }
    },
    async play() {
      await playerRef.current?.play().catch(() => {});
    },
  }));

  // One player and one renderer for the component's lifetime.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new SegmentationRenderer({
      objectColor: (id) => colorOf(statusRef.current.get(id)).fill,
      maskFillOpacity: 0.22,
      maskOutline: { opacity: 0.95 },
    });
    const scratch = document.createElement("canvas");

    const place = (c: VideoFrameCompositionContext) => {
      const { w: sw, h: sh } = sourceRef.current;
      const scale = (fit === "cover" ? Math.max : Math.min)(c.canvas.width / sw, c.canvas.height / sh);
      return { scale, ox: (c.canvas.width - sw * scale) / 2, oy: (c.canvas.height - sh * scale) / 2 };
    };

    // People are pixelated on every frame they appear in, inside their own outline so a dog
    // in front of someone stays sharp. SAM looks for people only for this.
    const blurPeople = (c: VideoFrameCompositionContext) => {
      const people = peopleRef.current.get(c.frameIndex);
      if (!people?.length) return;
      const { scale, ox, oy } = place(c);
      const ctx = c.ctx;
      const sctx = scratch.getContext("2d");
      if (!sctx) return;
      for (const p of people) {
        ctx.save();
        if (p.mask && p.bounds) {
          if (p.path === undefined) {
            try {
              p.path = new Path2D(decodeMaskToSVGPath(p.mask));
            } catch {
              p.path = null;
            }
          }
          if (p.path) {
            const sx = (p.bounds.right - p.bounds.left) / p.mask.width;
            const sy = (p.bounds.bottom - p.bounds.top) / p.mask.height;
            ctx.setTransform(scale * sx, 0, 0, scale * sy, ox + p.bounds.left * scale, oy + p.bounds.top * scale);
            ctx.clip(p.path);
          }
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const padX = (p.right - p.left) * 0.08;
        const padY = (p.bottom - p.top) * 0.05;
        const x = Math.max(0, ox + (p.left - padX) * scale);
        const y = Math.max(0, oy + (p.top - padY) * scale);
        const w = Math.min(c.canvas.width - x, (p.right - p.left + 2 * padX) * scale);
        const h = Math.min(c.canvas.height - y, (p.bottom - p.top + 2 * padY) * scale);
        if (w >= 2 && h >= 2) {
          const block = Math.max(6 * dprRef.current, w / 9);
          scratch.width = Math.max(1, Math.round(w / block));
          scratch.height = Math.max(1, Math.round(h / block));
          sctx.imageSmoothingEnabled = true;
          sctx.drawImage(ctx.canvas as CanvasImageSource, x, y, w, h, 0, 0, scratch.width, scratch.height);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(scratch, 0, 0, scratch.width, scratch.height, x, y, w, h);
        }
        ctx.restore();
      }
    };

    // Labels are drawn here rather than by the renderer, which prints the raw detection score.
    const drawLabels = (c: VideoFrameCompositionContext) => {
      const boxes = labelsRef.current.get(c.frameIndex);
      if (!boxes?.length) return;
      const dpr = dprRef.current;
      const { scale, ox, oy } = place(c);
      const ctx = c.ctx;
      const h = 24 * dpr;
      const pad = 9 * dpr;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = `600 ${13 * dpr}px "Mona Sans", ui-sans-serif, system-ui, sans-serif`;
      ctx.textBaseline = "middle";
      for (const b of boxes) {
        if (hiddenRef.current.has(b.id)) continue;
        if (String(selectedRef.current) === b.id) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2.5 * dpr;
          ctx.beginPath();
          ctx.roundRect(ox + b.left * scale - 4 * dpr, oy + b.top * scale - 4 * dpr, (b.right - b.left) * scale + 8 * dpr, (b.bottom - b.top) * scale + 8 * dpr, 10 * dpr);
          ctx.stroke();
        }
        const color = colorOf(statusRef.current.get(b.id));
        // A distant dog gets just its number, so a pack far off stays readable.
        const text = (b.bottom - b.top) * scale < 70 * dpr ? b.id : `Dog ${b.id}`;
        const w = ctx.measureText(text).width + pad * 2;
        const x = Math.min(Math.max(4 * dpr, ox + b.left * scale), c.canvas.width - w - 4 * dpr);
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
    player.loop = loop;
    player.setCustomRender((c) => {
      // A canvas caught mid-layout can have no area for a frame; skip that frame rather than stop the player.
      if (!(c.canvas.width > 0 && c.canvas.height > 0)) return;
      renderer.renderVideoFrame(c, { fit, devicePixelRatio: () => dprRef.current, hiddenIds: hiddenRef.current });
      blurPeople(c);
      drawLabels(c);
    });
    const offs = [
      player.on("timeupdate", ({ time }) => {
        setTime(time);
        onTimeRef.current?.((chunkRef.current?.startS ?? 0) + time);
      }),
      player.on("play", () => setPlaying(true)),
      player.on("pause", () => setPlaying(false)),
      player.on("ended", () => setPlaying(false)),
      player.on("error", ({ error }) => setError(error instanceof Error ? error.message : String(error))),
    ];
    playerRef.current = player;
    rendererRef.current = renderer;

    const outer = outerRef.current!;
    const wrap = wrapRef.current!;
    const resize = () => {
      dprRef.current = window.devicePixelRatio || 1;
      // Fill the width, but never taller than most of the screen; a portrait walk gets a narrower frame.
      const shape = narrowAspect && !window.matchMedia("(min-width: 640px)").matches ? narrowAspect : aspect;
      const maxH = Math.max(240, window.innerHeight * maxVh);
      const h = Math.round(Math.min(outer.clientWidth / shape, maxH));
      const w = Math.round(Math.min(outer.clientWidth, h * shape));
      // Hidden or still laying out: keep the last good size.
      if (!(w > 0 && h > 0)) return;
      wrap.style.width = `${w}px`;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.round(w * dprRef.current);
      canvas.height = Math.round(h * dprRef.current);
      player.forceRender().catch(() => {});
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(outer);
    return () => {
      ro.disconnect();
      offs.forEach((off) => off());
      player.dispose();
      renderer.dispose();
      playerRef.current = null;
      rendererRef.current = null;
    };
    // The player is created once; aspect and loop are read when it is made.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the selected piece: its video, its SAM output, and the people to blur.
  useEffect(() => {
    if (!chunk) return;
    let cancelled = false;
    const player = playerRef.current;
    const renderer = rendererRef.current;
    if (!player || !renderer) return;
    setReady(false);
    setError(null);
    // On the first piece nothing has been drawn yet, so the video can load while the tracking output does.
    const early = openedRef.current ? null : player.open(chunk.video).then(() => null, (e: unknown) => e);
    openedRef.current = true;
    (async () => {
      try {
        const map = new Map<string, number>();
        for (const d of dogs) for (const s of d.segments) if (s.chunk === chunk.idx) map.set(String(s.objectId), d.label);
        const [raw, peopleRaw] = await Promise.all([
          fetch(chunk.sam).then((r) => {
            if (!r.ok) throw new Error("The tracking output for this piece is missing.");
            return r.text();
          }),
          chunk.people ? fetch(chunk.people).then((r) => (r.ok ? r.text() : "")) : Promise.resolve(""),
        ]);
        const { text, hidden } = remapIds(raw, map);
        const [result, labels, people] = await Promise.all([
          parseVideoText(text),
          boxesByFrame(text),
          peopleRaw ? peopleByFrame(peopleRaw) : Promise.resolve(new Map<number, Person[]>()),
        ]);
        if (cancelled) return;
        const size = raw.match(/;w=(\d+);h=(\d+)/);
        if (size) sourceRef.current = { w: Number(size[1]), h: Number(size[2]) };
        labelsRef.current = labels;
        peopleRef.current = people;
        hiddenRef.current = hidden;
        await renderer.update(result, { reset: true });
        if (early) {
          const failed = await early;
          if (failed) throw failed;
          await player.forceRender().catch(() => {});
        } else {
          await player.open(chunk.video);
        }
        if (cancelled) return;
        if (pendingSeekRef.current != null) {
          await player.seek(pendingSeekRef.current).catch(() => {});
          pendingSeekRef.current = null;
        }
        setReady(true);
        onReadyRef.current?.();
        setTime(0);
        if (autoPlay) await player.play().catch(() => {});
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "This piece couldn’t be loaded.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chunk, dogs, autoPlay]);

  async function toggle() {
    const p = playerRef.current;
    if (!p) return;
    if (p.paused) await p.play().catch(() => {});
    else p.pause();
  }

  return (
    <div ref={outerRef}>
      {/* The same size the resize effect computes, so the frame doesn't jump when the script loads. */}
      <div
        ref={wrapRef}
        className={`replay-frame relative mx-auto max-w-full overflow-hidden bg-[#08121c] ${rounded}`}
        style={{ "--ar": aspect, "--ar-narrow": narrowAspect ?? aspect, "--max-h": `${maxVh * 100}vh` } as CSSProperties}
      >
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
        )}
        <canvas ref={canvasRef} className="relative block" aria-label="Walk video with each dog outlined and numbered by SAM 3.1, and people blurred" />
        {!ready && !error && !poster && <p className="absolute inset-0 flex items-center justify-center text-[0.9375rem] text-white/70">Loading the video</p>}
        {error && <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-[0.9375rem] text-white">{error}</p>}
      </div>
      {controls && (
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
      )}
    </div>
  );
}
