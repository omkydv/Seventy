/**
 * Turning per-chunk SAM tracks into one list of dogs for the whole walk.
 * Chunks overlap by a couple of seconds; objects seen in both halves of an
 * overlap are the same dog, matched by how much their boxes coincide.
 */

export type ChunkInput = {
  idx: number;
  startS: number;
  fps: number;
  width: number;
  height: number;
  objects: Record<string, { f: number[]; b: [number, number, number, number][]; c: (number | null)[] }>;
};

export type Sighting = {
  /** Seconds from the start of the walk. */
  t: number;
  /** Box normalised to 0..1 of the processed frame. */
  box: [number, number, number, number];
  conf: number | null;
  chunk: number;
  frame: number;
  objectId: string;
};

export type WalkDog = {
  label: number;
  segments: { chunk: number; objectId: string }[];
  sightings: Sighting[];
  firstS: number;
  lastS: number;
  meanConf: number | null;
};

type Key = string; // `${chunk}:${objectId}`

function iou(a: number[], b: number[]): number {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[2], b[2]);
  const y2 = Math.min(a[3], b[3]);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = (a[2] - a[0]) * (a[3] - a[1]);
  const areaB = (b[2] - b[0]) * (b[3] - b[1]);
  const union = areaA + areaB - inter;
  return union > 0 ? inter / union : 0;
}

class UnionFind {
  parent = new Map<Key, Key>();
  find(k: Key): Key {
    if (!this.parent.has(k)) this.parent.set(k, k);
    let p = this.parent.get(k)!;
    while (p !== this.parent.get(p)) p = this.parent.get(p)!;
    this.parent.set(k, p);
    return p;
  }
  union(a: Key, b: Key) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(rb, ra);
  }
}

export type StitchOptions = {
  /** Drop tracks seen for less than this many seconds. */
  minSeconds?: number;
  /** Drop tracks whose mean confidence is below this. */
  minConf?: number;
  /** Mean IoU in the overlap needed to call two objects the same dog. */
  linkIou?: number;
};

export function stitchChunks(chunks: ChunkInput[], opts: StitchOptions = {}): WalkDog[] {
  const { minSeconds = 0.6, minConf = 0.35, linkIou = 0.35 } = opts;
  const sorted = [...chunks].sort((a, b) => a.idx - b.idx);
  const sightings = new Map<Key, Sighting[]>();

  for (const ch of sorted) {
    for (const [id, o] of Object.entries(ch.objects)) {
      const list: Sighting[] = o.f.map((f, i) => {
        const [l, t, r, b] = o.b[i];
        return {
          t: ch.startS + f / ch.fps,
          box: [l / ch.width, t / ch.height, r / ch.width, b / ch.height],
          conf: o.c[i],
          chunk: ch.idx,
          frame: f,
          objectId: id,
        };
      });
      sightings.set(`${ch.idx}:${id}`, list);
    }
  }

  const uf = new UnionFind();
  for (const k of sightings.keys()) uf.find(k);

  // Link objects across each overlap between consecutive chunks.
  for (let i = 0; i + 1 < sorted.length; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const aKeys = Object.keys(a.objects).map((id) => `${a.idx}:${id}`);
    const bKeys = Object.keys(b.objects).map((id) => `${b.idx}:${id}`);
    const pairs: { ka: Key; kb: Key; score: number }[] = [];
    for (const ka of aKeys) {
      const sa = sightings.get(ka)!.filter((s) => s.t >= b.startS - 1e-6);
      if (!sa.length) continue;
      for (const kb of bKeys) {
        const sb = sightings.get(kb)!;
        let sum = 0;
        let n = 0;
        for (const x of sa) {
          const y = sb.find((s) => Math.abs(s.t - x.t) < 0.5 / b.fps + 1e-6);
          if (y) {
            sum += iou(x.box, y.box);
            n++;
          }
        }
        if (n >= 2 && sum / n >= linkIou) pairs.push({ ka, kb, score: sum / n });
      }
    }
    // Greedy one-to-one matching, best overlaps first.
    pairs.sort((p, q) => q.score - p.score);
    const usedA = new Set<Key>();
    const usedB = new Set<Key>();
    for (const p of pairs) {
      if (usedA.has(p.ka) || usedB.has(p.kb)) continue;
      usedA.add(p.ka);
      usedB.add(p.kb);
      uf.union(p.ka, p.kb);
    }
  }

  // Gather groups into dogs, dropping duplicate sightings from overlaps.
  const groups = new Map<Key, Key[]>();
  for (const k of sightings.keys()) {
    const root = uf.find(k);
    const g = groups.get(root) ?? [];
    g.push(k);
    groups.set(root, g);
  }

  const dogs: Omit<WalkDog, "label">[] = [];
  for (const keys of groups.values()) {
    const all = keys.flatMap((k) => sightings.get(k)!).sort((x, y) => x.t - y.t);
    const merged: Sighting[] = [];
    for (const s of all) {
      const last = merged[merged.length - 1];
      if (last && Math.abs(last.t - s.t) < 1e-3) continue;
      merged.push(s);
    }
    if (!merged.length) continue;
    const span = merged[merged.length - 1].t - merged[0].t;
    const confs = merged.map((s) => s.conf).filter((c): c is number => c != null);
    const meanConf = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null;
    if (span < minSeconds && merged.length < 4) continue;
    if (meanConf != null && meanConf < minConf) continue;
    dogs.push({
      segments: keys.map((k) => {
        const [chunk, objectId] = k.split(":");
        return { chunk: Number(chunk), objectId };
      }),
      sightings: merged,
      firstS: merged[0].t,
      lastS: merged[merged.length - 1].t,
      meanConf,
    });
  }

  dogs.sort((a, b) => a.firstS - b.firstS);
  return dogs.map((d, i) => ({ ...d, label: i + 1 }));
}

/**
 * Candidate frames for reading marks: large, confident, not cut off by the
 * frame edge, and spread out in time so the best views aren't all the same.
 */
export function pickSamples(dog: WalkDog, count = 5, minGapS = 0.8) {
  const scored = dog.sightings.map((s) => {
    const [l, t, r, b] = s.box;
    const area = Math.max(0, r - l) * Math.max(0, b - t);
    const edge = l < 0.01 || t < 0.01 || r > 0.99 || b > 0.99 ? 0.55 : 1;
    return { s, score: Math.pow(area, 0.75) * (s.conf ?? 0.6) * edge };
  });
  scored.sort((a, b) => b.score - a.score);
  const picked: Sighting[] = [];
  for (const { s } of scored) {
    if (picked.every((p) => Math.abs(p.t - s.t) >= minGapS)) picked.push(s);
    if (picked.length >= count) break;
  }
  return picked.sort((a, b) => a.t - b.t);
}
