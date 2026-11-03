/** A GPS fix during a recorded walk: [seconds into the video, latitude, longitude, accuracy in metres]. */
export type Fix = [number, number, number, number];
export type LatLon = [number, number];

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function metres(a: LatLon, b: LatLon): number {
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Fixes worth drawing: in time order, none worse than `maxAcc` metres (unless that would leave
 * fewer than two), and none that jump faster than a person walks or jogs (a bad fix, not a step).
 */
export function cleanFixes(points: Fix[], maxAcc = 35, maxSpeed = 4): Fix[] {
  const sorted = [...points].filter((p) => p.every(Number.isFinite)).sort((a, b) => a[0] - b[0]);
  const accurate = sorted.filter((p) => p[3] <= maxAcc);
  const base = accurate.length >= 2 ? accurate : sorted;
  const out: Fix[] = [];
  for (const p of base) {
    const last = out[out.length - 1];
    if (last) {
      const dt = Math.max(0.5, p[0] - last[0]);
      if (metres([last[1], last[2]], [p[1], p[2]]) / dt > maxSpeed) continue;
    }
    out.push(p);
  }
  return out;
}

/** Where the phone was `t` seconds into the video, between the two fixes around it. */
export function positionAt(points: Fix[], t: number): LatLon | null {
  if (!points.length) return null;
  if (t <= points[0][0]) return [points[0][1], points[0][2]];
  const last = points[points.length - 1];
  if (t >= last[0]) return [last[1], last[2]];
  for (let i = 1; i < points.length; i++) {
    const b = points[i];
    if (b[0] < t) continue;
    const a = points[i - 1];
    const k = b[0] === a[0] ? 0 : (t - a[0]) / (b[0] - a[0]);
    return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }
  return [last[1], last[2]];
}

/** Metres walked from the start of the route to `t` seconds into the video. */
export function distanceAt(points: Fix[], t: number): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (b[0] <= t) {
      d += metres([a[1], a[2]], [b[1], b[2]]);
      continue;
    }
    if (a[0] < t) {
      const p = positionAt(points, t)!;
      d += metres([a[1], a[2]], p);
    }
    break;
  }
  return d;
}

export const totalDistance = (points: Fix[]) => (points.length ? distanceAt(points, points[points.length - 1][0]) : 0);

/**
 * Places to go back to: dogs within `radius` metres of each other, grouped greedily from the
 * start of the route, so a team can work through them in the order they walked.
 */
export function spots<T extends { at: LatLon; t: number }>(items: T[], radius = 40): { centre: LatLon; items: T[] }[] {
  const groups: { centre: LatLon; items: T[] }[] = [];
  for (const it of [...items].sort((a, b) => a.t - b.t)) {
    const near = groups.find((g) => metres(g.centre, it.at) <= radius);
    if (near) {
      near.items.push(it);
      const n = near.items.length;
      near.centre = [near.centre[0] + (it.at[0] - near.centre[0]) / n, near.centre[1] + (it.at[1] - near.centre[1]) / n];
    } else {
      groups.push({ centre: it.at, items: [it] });
    }
  }
  return groups;
}

/** "about 120 m", "1.4 km". */
export function distanceText(m: number): string {
  if (m < 1000) return `${Math.max(5, Math.round(m / 5) * 5)} m`;
  return `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`;
}
