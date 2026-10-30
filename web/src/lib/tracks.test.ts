import { describe, expect, it } from "vitest";
import { pickSamples, stitchChunks, type ChunkInput } from "./tracks";

/** One object moving across a piece: frames f, a 100-px box sliding right by `step` each frame. */
function track(frames: number[], x0: number, step: number, conf = 0.9) {
  return {
    f: frames,
    b: frames.map((_, i) => [x0 + i * step, 100, x0 + i * step + 100, 200] as [number, number, number, number]),
    c: frames.map(() => conf),
  };
}

const range = (a: number, b: number) => Array.from({ length: b - a }, (_, i) => a + i);

describe("stitchChunks", () => {
  it("joins one dog seen in the overlap of two pieces into a single dog", () => {
    // Piece 0 covers 0–6 s, piece 1 starts at 4 s; at 5 fps the overlap is frames 20–29 of piece 0.
    const a: ChunkInput = { idx: 0, startS: 0, fps: 5, width: 960, height: 540, objects: { "0": track(range(0, 30), 100, 2) } };
    const b: ChunkInput = { idx: 1, startS: 4, fps: 5, width: 960, height: 540, objects: { "3": track(range(0, 20), 140, 2) } };
    const dogs = stitchChunks([a, b]);
    expect(dogs).toHaveLength(1);
    expect(dogs[0].segments.map((s) => s.chunk)).toEqual([0, 1]);
    expect(dogs[0].lastS).toBeGreaterThan(7);
  });

  it("keeps two dogs apart when their boxes never meet", () => {
    const a: ChunkInput = { idx: 0, startS: 0, fps: 5, width: 960, height: 540, objects: { "0": track(range(0, 30), 50, 0), "1": track(range(0, 30), 700, 0) } };
    expect(stitchChunks([a])).toHaveLength(2);
  });

  it("drops a flicker too short or too unsure to be a dog", () => {
    const a: ChunkInput = { idx: 0, startS: 0, fps: 5, width: 960, height: 540, objects: { "0": track(range(0, 30), 50, 0), "9": track([3, 4], 600, 0, 0.2) } };
    expect(stitchChunks([a])).toHaveLength(1);
  });
});

describe("pickSamples", () => {
  it("prefers large, confident views spread through the walk", () => {
    const a: ChunkInput = { idx: 0, startS: 0, fps: 5, width: 960, height: 540, objects: { "0": track(range(0, 40), 50, 10) } };
    const [dog] = stitchChunks([a]);
    const picked = pickSamples(dog, 3, 1);
    expect(picked).toHaveLength(3);
    for (let i = 1; i < picked.length; i++) expect(picked[i].t - picked[i - 1].t).toBeGreaterThanOrEqual(1);
  });
});
