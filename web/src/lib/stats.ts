/** Survey statistics. Plain functions, shared by the server and the browser. */

export const TARGET = 0.7;

export type Interval = { p: number; low: number; high: number };

/** Wilson score interval for k successes out of n. Behaves well near 0 and 1 and at small n. */
export function wilson(k: number, n: number, z = 1.959964): Interval {
  if (n <= 0) return { p: 0, low: 0, high: 1 };
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { p, low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

export type CoverageStatus = "confident" | "complete" | "below" | "insufficient";

/**
 * A ward is complete when the point estimate reaches the target, and
 * confidently complete when the lower bound does too. Fewer than 10 readable
 * dogs is not enough to call either way.
 */
export function coverageStatus(ci: Interval, readable: number, target = TARGET): CoverageStatus {
  if (readable < 10) return "insufficient";
  if (ci.low >= target) return "confident";
  if (ci.p >= target) return "complete";
  return "below";
}

/** Unmarked dogs that need vaccinating, among those seen, for marked/readable to reach the target. */
export function dogsToGo(marked: number, readable: number, target = TARGET): number {
  return Math.max(0, Math.ceil(target * readable - marked - 1e-9));
}

export type Coverage = {
  marked: number;
  unmarked: number;
  unknown: number;
  readable: number;
  ci: Interval;
  status: CoverageStatus;
  toGo: number;
  /** Coverage if every unreadable dog were unmarked, and if every one were marked. */
  worst: number;
  best: number;
};

export function coverage(marked: number, unmarked: number, unknown: number, target = TARGET): Coverage {
  const readable = marked + unmarked;
  const ci = wilson(marked, readable);
  const total = readable + unknown;
  return {
    marked,
    unmarked,
    unknown,
    readable,
    ci,
    status: coverageStatus(ci, readable, target),
    toGo: dogsToGo(marked, readable, target),
    worst: total ? marked / total : 0,
    best: total ? (marked + unknown) / total : 0,
  };
}

export type StatDog = {
  mark_status: string | null;
  review_status: string | null;
  same_as?: number | null;
  mark?: { life_stage?: string; lead?: { status: string } } | null;
};

/**
 * A walk's numbers. A dog seen again after leaving the frame counts once, a
 * person's review stands over the model's reading, and anything that isn't a
 * dog is left out.
 */
export function walkStats(dogs: StatDog[], target: string) {
  let marked = 0;
  let unmarked = 0;
  let unknown = 0;
  let excluded = 0;
  let repeats = 0;
  let puppies = 0;
  let onLead = 0;
  for (const d of dogs) {
    if (d.same_as) {
      repeats++;
      continue;
    }
    const s = d.review_status ?? d.mark_status ?? "unknown";
    if (s === "not_a_dog" || s === "duplicate") {
      excluded++;
      continue;
    }
    if (s === "marked") marked++;
    else if (s === "unmarked") unmarked++;
    else unknown++;
    if (d.mark?.life_stage === "puppy") puppies++;
    if (d.mark?.lead?.status === "present") onLead++;
  }
  return { target, dogs: marked + unmarked + unknown, excluded, repeats, puppies, onLead, ...coverage(marked, unmarked, unknown) };
}

export type Population = { n: number; low: number; high: number; se: number };

/**
 * Chapman's bias-corrected Lincoln–Petersen estimator for two sighting
 * occasions: n1 dogs seen on walk one, n2 on walk two, m seen on both.
 * Interval is a normal approximation, floored at the number of distinct dogs seen.
 */
export function chapman(n1: number, n2: number, m: number, z = 1.959964): Population {
  const n = ((n1 + 1) * (n2 + 1)) / (m + 1) - 1;
  const variance = ((n1 + 1) * (n2 + 1) * (n1 - m) * (n2 - m)) / ((m + 1) * (m + 1) * (m + 2));
  const se = Math.sqrt(Math.max(0, variance));
  const seenAtLeast = n1 + n2 - m;
  return { n, se, low: Math.max(seenAtLeast, n - z * se), high: n + z * se };
}

/** Program-records method: sterilized (or vaccinated) count divided by the marked fraction seen. */
export function populationFromRecords(programMarked: number, ci: Interval): Population | null {
  if (ci.p <= 0) return null;
  const n = programMarked / ci.p;
  return {
    n,
    se: NaN,
    low: ci.high > 0 ? programMarked / ci.high : n,
    high: ci.low > 0 ? programMarked / ci.low : Infinity,
  };
}

export const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`;
