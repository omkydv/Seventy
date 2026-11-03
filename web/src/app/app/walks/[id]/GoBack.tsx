"use client";

import { useMemo, useState } from "react";
import { DogGlyph, type GlyphStatus } from "@/components/DogGlyph";
import { WalkMap, type MapDog } from "@/components/WalkMap";
import { clock, day, plural } from "@/lib/format";
import { cleanFixes, distanceAt, distanceText, metres, positionAt, spots as group, totalDistance, type LatLon } from "@/lib/route";
import { effectiveStatus, type Dog, type Walk } from "@/lib/types";

const LABEL: Record<string, string> = { marked: "Marked", unmarked: "Not marked", unknown: "Can’t tell", counted: "Counted" };
const glyph = (s: string): GlyphStatus => (s === "marked" ? "marked" : s === "unknown" ? "unknown" : "unmarked");
const at5 = (p: LatLon) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;
// Walking directions from wherever the phone is now, in whichever maps app it opens.
const directions = (p: LatLon) => `https://www.google.com/maps/dir/?api=1&destination=${at5(p)}&travelmode=walking`;
const fromStart = (m: number) => (m < 3 ? "at the start" : `${distanceText(m)} from the start`);

/**
 * The follow-up a survey exists for. Checking a drive: the dogs still to vaccinate, grouped into
 * places along the route. Planning one: where every dog is. Walks recorded in Seventy carry the
 * phone's route, so each dog sits on a map where it was first seen.
 */
export function GoBack({ walk, dogs, selected, onShow }: { walk: Walk; dogs: Dog[]; selected: number | null; onShow: (label: number) => void }) {
  const [hidden, setHidden] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const plan = walk.mode === "plan";
  const route = useMemo(() => (walk.route?.points?.length ? cleanFixes(walk.route.points) : []), [walk.route]);
  const mapped = route.length >= 2;

  const items = useMemo(
    () =>
      dogs
        .filter((d) => effectiveStatus(d) !== "duplicate" && effectiveStatus(d) !== "not_a_dog")
        .map((d) => {
          const s = effectiveStatus(d);
          const status: MapDog["status"] = plan && s !== "marked" ? "counted" : (s as "marked" | "unmarked" | "unknown");
          return { d, status, t: d.first_s, at: mapped ? positionAt(route, d.first_s) : null, m: mapped ? distanceAt(route, d.first_s) : null };
        }),
    [dogs, plan, mapped, route],
  );
  const todo = useMemo(() => (plan ? items : items.filter((i) => i.status === "unmarked" || i.status === "unknown")), [items, plan]);
  const places = useMemo(
    () => (mapped ? group(todo.filter((i) => i.status === "unmarked" && i.at).map((i) => ({ ...i, at: i.at! })), 40) : []),
    [todo, mapped],
  );
  const mapDogs = useMemo<MapDog[]>(() => items.filter((i) => i.at).map((i) => ({ label: i.d.label, at: i.at!, status: i.status })), [items]);
  // Each ring just holds its own dogs: their spread from the centre, plus a margin for GPS error.
  const mapSpots = useMemo(
    () => places.map((p) => ({ centre: p.centre, count: p.items.length, radius: Math.min(45, Math.max(10, ...p.items.map((i) => metres(p.centre, i.at) + 8))) })),
    [places],
  );
  const length = mapped ? totalDistance(route) : 0;

  if (!items.length) return null;
  const unmarked = todo.filter((i) => i.status === "unmarked").length;
  const unread = todo.length - unmarked;
  const again = `Film ${unread === 1 ? "it" : "them"} again from closer, side-on, so the ears show.`;
  const title = plan ? "Where the dogs are" : unmarked ? "Where to go back" : unread ? "Dogs to film again" : "Every dog on this walk";
  const lede = plan
    ? `${plural(items.length, "dog")}${mapped ? ` along ${distanceText(length)} of street` : ""}, in the order the walk met them.`
    : unmarked
      ? `${plural(unmarked, "dog")} not marked${mapped && places.length ? `, in ${plural(places.length, "place")} along the route` : ""}. Vaccinating them is the quickest way to the 70% line.${unread ? ` ${plural(unread, "more dog")} couldn’t be read.` : ""}`
      : unread
        ? `${unread === items.length ? `No dog on this walk could be read.` : `Every dog Seventy could read carries a mark; ${plural(unread, "dog")} couldn’t be read.`} ${again}`
        : "Every dog on this walk carries a mark.";
  const rows = todo.length ? todo : items;
  const placeOf = (id: string) => places.findIndex((p) => p.items.some((x) => x.d.id === id));

  // The list as plain text, for the team's chat: one line per dog, a map link per place.
  async function send() {
    const head = `${walk.area_name || walk.title || "Walk"}, ${day(walk.recorded_at ?? walk.created_at)}`;
    const lines = [`Seventy: ${title.toLowerCase()}`, head, lede, ""];
    const done = new Set<number>();
    for (const i of rows) {
      const k = placeOf(i.d.id);
      if (k >= 0 && !done.has(k)) {
        done.add(k);
        lines.push(`Place ${k + 1}: ${directions(places[k].centre)}`);
      }
      const where = i.m != null ? `${fromStart(i.m)}, ` : "";
      lines.push(`${k >= 0 ? "  " : ""}Dog ${i.d.label}, ${LABEL[i.status].toLowerCase()}, ${where}${clock(i.t)} into the walk${k < 0 && i.at ? `: ${directions(i.at)}` : ""}`);
    }
    const text = lines.join("\n");
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: `Seventy: ${head}`, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setSent("Copied. Paste it into the team’s chat.");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setSent("This browser blocked copying. Select the list and copy it instead.");
    }
    window.setTimeout(() => setSent(null), 4000);
  }

  return (
    <section className="mt-14" aria-labelledby="goback">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="goback" className="text-xl font-semibold tracking-[-0.01em]">
            {title}
          </h2>
          <p className="mt-1 text-ink-2">{lede}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mapped && (
            <div className="flex rounded-full bg-canvas-2 p-1 text-[0.8125rem] font-semibold" role="group" aria-label="Map style">
              {(["Street map", "Route only"] as const).map((v, i) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={hidden === (i === 1)}
                  onClick={() => setHidden(i === 1)}
                  className={`rounded-full px-3.5 py-1.5 transition-colors ${hidden === (i === 1) ? "bg-surface text-ink shadow-[0_1px_2px_rgb(var(--shadow)/0.15)]" : "text-ink-2 hover:text-ink"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={send} className="btn btn-secondary btn-sm">
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 14.5V4m0 0L8 8m4-4 4 4" />
              <path d="M5 12.5v5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-5" />
            </svg>
            Send to the team
          </button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {sent}
      </p>
      {sent && <p className="mt-3 text-right text-[0.875rem] font-medium text-ink-2">{sent}</p>}

      <div className="mt-5 grid grid-cols-12 gap-5">
        {mapped && (
          <div className="panel col-span-12 overflow-hidden lg:col-span-8">
            <WalkMap route={route} dogs={mapDogs} spots={mapSpots} selected={selected} hidden={hidden} onPick={onShow} />
            <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line px-4 py-2.5 text-[0.8125rem] text-ink-2">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-3 rounded-full border-[3px] border-ink bg-white" />
                Start
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-3 rounded-full bg-ink" />
                End
              </span>
              {places.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="size-3.5 rounded-full border-2 border-amber bg-amber/20" />
                  Place to go back to
                </span>
              )}
              <span className="ml-auto">Each dog sits where the phone was when it first came into view.</span>
            </div>
          </div>
        )}
        <ol className={`col-span-12 ${mapped ? "space-y-2 lg:col-span-4 lg:max-h-[480px] lg:overflow-y-auto lg:pr-1" : "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"}`}>
          {rows.map((i, n) => {
            const place = placeOf(i.d.id);
            return (
              <li
                key={i.d.id}
                className={`flex items-center rounded-[14px] bg-surface shadow-[inset_0_0_0_1px_var(--line)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--ink-3)] ${selected === i.d.label ? "shadow-[inset_0_0_0_2px_var(--ink)]" : ""}`}
              >
                <button type="button" onClick={() => onShow(i.d.label)} className="flex min-w-0 flex-1 items-center gap-3 rounded-[14px] py-3 pl-4 pr-2 text-left">
                  <span className="num w-5 shrink-0 text-[0.8125rem] font-semibold text-ink-3">{n + 1}</span>
                  <DogGlyph status={glyph(i.status)} size={26} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      Dog {i.d.label}
                      <span className="ml-2 text-[0.8125rem] font-medium text-ink-3">{LABEL[i.status]}</span>
                    </span>
                    <span className="num block text-[0.8125rem] text-ink-2 first-letter:uppercase">
                      {i.m != null ? `${fromStart(i.m)}, ` : ""}
                      {clock(i.t)} into the walk{place >= 0 ? `, place ${place + 1}` : ""}
                    </span>
                  </span>
                  {!i.at && <span className="text-[0.8125rem] font-semibold text-ink-2">Show</span>}
                </button>
                {i.at && (
                  <a
                    href={directions(i.at)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Walking directions to Dog ${i.d.label}`}
                    className="mr-2 shrink-0 rounded-full px-3 py-2 text-[0.8125rem] font-semibold text-ink-2 transition-colors hover:bg-canvas-2 hover:text-ink"
                  >
                    Directions
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      {!mapped && <p className="mt-3 text-[0.875rem] text-ink-3">Record the walk in Seventy and every dog also lands on a map, where it was first seen.</p>}
    </section>
  );
}
