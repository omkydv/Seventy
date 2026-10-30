import { describe, expect, it } from "vitest";
import { chapman, coverage, coverageStatus, dogsToGo, walkStats, wilson } from "./stats";

describe("wilson", () => {
  it("gives the full range when nothing was read", () => {
    expect(wilson(0, 0)).toEqual({ p: 0, low: 0, high: 1 });
  });

  it("matches the published worked example (284 marked of 396)", () => {
    const ci = wilson(284, 396);
    expect(ci.p).toBeCloseTo(0.7172, 4);
    expect(ci.low).toBeCloseTo(0.671, 3);
    expect(ci.high).toBeCloseTo(0.759, 3);
  });

  it("stays inside 0 to 1 at the edges", () => {
    expect(wilson(0, 5).low).toBe(0);
    expect(wilson(5, 5).high).toBe(1);
    expect(wilson(5, 5).low).toBeGreaterThan(0.5);
  });
});

describe("coverageStatus", () => {
  it("refuses to call an area from fewer than ten readable dogs", () => {
    expect(coverageStatus(wilson(9, 9), 9)).toBe("insufficient");
  });

  it("separates confident, complete and below", () => {
    expect(coverageStatus(wilson(95, 100), 100)).toBe("confident");
    expect(coverageStatus(wilson(72, 100), 100)).toBe("complete");
    expect(coverageStatus(wilson(60, 100), 100)).toBe("below");
  });
});

describe("dogsToGo", () => {
  it("counts the extra dogs to vaccinate among those seen", () => {
    expect(dogsToGo(6, 10)).toBe(1);
    expect(dogsToGo(7, 10)).toBe(0);
    expect(dogsToGo(0, 10)).toBe(7);
  });
});

describe("coverage", () => {
  it("bounds coverage by what the unreadable dogs could be", () => {
    const c = coverage(6, 2, 2);
    expect(c.readable).toBe(8);
    expect(c.worst).toBeCloseTo(0.6);
    expect(c.best).toBeCloseTo(0.8);
  });
});

describe("chapman", () => {
  it("estimates the worked example on the landing page", () => {
    const p = chapman(30, 28, 18);
    expect(p.n).toBeCloseTo(46.3, 1); // (31 × 29) / 19 − 1
    expect(p.low).toBeGreaterThanOrEqual(40);
  });
});

describe("walkStats", () => {
  const dog = (mark_status: string, extra: Record<string, unknown> = {}) => ({ mark_status, review_status: null, ...extra });

  it("counts a dog seen again only once", () => {
    const s = walkStats([dog("unmarked"), dog("unmarked", { same_as: 1 })], "vaccination");
    expect(s.dogs).toBe(1);
    expect(s.repeats).toBe(1);
  });

  it("lets a person's review stand over the model's reading", () => {
    const s = walkStats([dog("unknown", { review_status: "marked" }), dog("unmarked")], "vaccination");
    expect(s.marked).toBe(1);
    expect(s.unknown).toBe(0);
  });

  it("leaves out what isn't a dog, and notes puppies and dogs on a lead", () => {
    const s = walkStats(
      [dog("unmarked", { review_status: "not_a_dog" }), dog("unmarked", { mark: { life_stage: "puppy" } }), dog("marked", { mark: { lead: { status: "present" } } })],
      "vaccination",
    );
    expect(s.dogs).toBe(2);
    expect(s.excluded).toBe(1);
    expect(s.puppies).toBe(1);
    expect(s.onLead).toBe(1);
  });
});
