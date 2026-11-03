import { describe, expect, it } from "vitest";
import { cleanFixes, distanceAt, distanceText, metres, positionAt, spots, totalDistance, type Fix } from "./route";

// A straight walk north at 1.25 m/s: 0.0001° of latitude is about 11.1 m.
const walk: Fix[] = [
  [0, 27.0, 85.0, 5],
  [10, 27.0001125, 85.0, 5],
  [20, 27.000225, 85.0, 5],
  [30, 27.0003375, 85.0, 5],
];

describe("route", () => {
  it("measures metres between fixes", () => {
    expect(metres([27, 85], [27.0001, 85])).toBeCloseTo(11.12, 1);
    expect(metres([27, 85], [27, 85])).toBe(0);
  });

  it("finds where the phone was between two fixes", () => {
    const p = positionAt(walk, 5)!;
    expect(p[0]).toBeCloseTo(27.00005625, 7);
    expect(positionAt(walk, -3)).toEqual([27.0, 85.0]);
    expect(positionAt(walk, 99)).toEqual([27.0003375, 85.0]);
    expect(positionAt([], 1)).toBeNull();
  });

  it("adds up the distance walked", () => {
    expect(totalDistance(walk)).toBeCloseTo(37.5, 0);
    expect(distanceAt(walk, 15)).toBeCloseTo(18.8, 0);
    expect(distanceAt(walk, 0)).toBe(0);
  });

  it("drops fixes that are too vague or jump impossibly far", () => {
    const noisy: Fix[] = [walk[0], [5, 27.002, 85.0, 6], walk[1], [12, 27.00013, 85.0, 120], walk[2]];
    const clean = cleanFixes(noisy);
    expect(clean.map((p) => p[0])).toEqual([0, 10, 20]);
  });

  it("keeps vague fixes when they are all there is", () => {
    expect(cleanFixes([[0, 27, 85, 80], [10, 27.0001, 85, 90]])).toHaveLength(2);
  });

  it("groups nearby dogs into places to go back to, in walking order", () => {
    const dogs = [
      { label: 3, t: 25, at: [27.0006, 85.0] as [number, number] },
      { label: 1, t: 2, at: [27.0, 85.0] as [number, number] },
      { label: 2, t: 4, at: [27.00002, 85.00001] as [number, number] },
    ];
    const g = spots(dogs, 40);
    expect(g).toHaveLength(2);
    expect(g[0].items.map((d) => d.label)).toEqual([1, 2]);
    expect(g[1].items.map((d) => d.label)).toEqual([3]);
  });

  it("writes distances people read", () => {
    expect(distanceText(3)).toBe("5 m");
    expect(distanceText(118)).toBe("120 m");
    expect(distanceText(1430)).toBe("1.4 km");
  });
});
