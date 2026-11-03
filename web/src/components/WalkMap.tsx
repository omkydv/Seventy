"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type * as Maplibre from "maplibre-gl";
import { DOG_PATH } from "@/components/DogGlyph";
import type { Fix, LatLon } from "@/lib/route";

export type MapDog = { label: number; at: LatLon; status: "marked" | "unmarked" | "unknown" | "counted" };
/** A place to go back to: its centre, how many dogs, and how far (metres) its dogs spread from the centre. */
export type MapSpot = { centre: LatLon; count: number; radius: number };

// OpenFreeMap: OpenStreetMap data as vector tiles, free for any use, no key.
const STYLE = "https://tiles.openfreemap.org/styles/positron";
const OURS = "seventy-";
const INK = "#0c1a28";

const FILL: Record<MapDog["status"], { fill: string; stroke: string; dash?: string }> = {
  marked: { fill: "#12a85f", stroke: "#12a85f" },
  unmarked: { fill: "#ffffff", stroke: INK },
  counted: { fill: "#ffffff", stroke: INK },
  unknown: { fill: "#ffffff", stroke: "#6e7f91", dash: "2.2 1.6" },
};

function pin(d: MapDog, selected: boolean) {
  const f = FILL[d.status];
  const ring = selected ? `box-shadow:0 0 0 3px ${INK},0 6px 16px -4px rgb(12 26 40/.6)` : "box-shadow:0 0 0 1px rgb(12 26 40/.14),0 6px 16px -6px rgb(12 26 40/.55)";
  return `<div style="display:flex;align-items:center;gap:4px;cursor:pointer">
    <span style="display:flex;width:34px;height:34px;align-items:center;justify-content:center;border-radius:999px;background:#fff;${ring}">
      <svg viewBox="0 0 36 24" width="22" height="15" aria-hidden="true"><path d="${DOG_PATH}" fill="${f.fill}" stroke="${f.stroke}" stroke-width="1.6" stroke-linejoin="round"${f.dash ? ` stroke-dasharray="${f.dash}"` : ""}/></svg>
    </span>
    <span style="font:600 12px/1 'Mona Sans',system-ui,sans-serif;color:${INK};background:#fff;border-radius:999px;padding:3px 6px;box-shadow:0 1px 2px rgb(12 26 40/.2)">${d.label}</span>
  </div>`;
}

const lonLat = (p: LatLon): [number, number] => [p[1], p[0]];

/** A circle `r` metres round, as a polygon: map circles are drawn in pixels, places are measured in metres. */
function ring(c: LatLon, r: number, n = 48): [number, number][] {
  const dLat = r / 111_320;
  const dLon = r / (111_320 * Math.cos((c[0] * Math.PI) / 180));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * 2 * Math.PI;
    return [c[1] + dLon * Math.cos(a), c[0] + dLat * Math.sin(a)] as [number, number];
  });
}

function bounds(route: Fix[], dogs: MapDog[]): [[number, number], [number, number]] {
  const pts = [...route.map((p) => [p[2], p[1]]), ...dogs.map((d) => lonLat(d.at))];
  const lons = pts.map((p) => p[0]);
  const lats = pts.map((p) => p[1]);
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
}

/**
 * Dogs whose pins would overlap at this zoom, grouped greedily by distance on screen. A pack
 * crossing the road shares one spot, so groups are what keep every dog readable.
 */
function groupOnScreen(points: { x: number; y: number }[], within = 40): number[][] {
  const groups: number[][] = [];
  points.forEach((p, i) => {
    const g = groups.find((g) => Math.hypot(points[g[0]].x - p.x, points[g[0]].y - p.y) < within);
    if (g) g.push(i);
    else groups.push([i]);
  });
  return groups;
}

/** Offsets, in pixels, that fan a small group around its spot. */
const fanOffset = (k: number, n: number): [number, number] => {
  if (n < 2) return [0, 0];
  const r = 18 + 4 * n;
  const a = -Math.PI / 2 + (k / n) * 2 * Math.PI;
  return [Math.round(r * Math.cos(a)), Math.round(r * Math.sin(a))];
};

function clusterPin(n: number, unmarked: number) {
  const ring = unmarked ? "box-shadow:0 0 0 2px #c47a06,0 6px 16px -6px rgb(12 26 40/.55)" : "box-shadow:0 0 0 1px rgb(12 26 40/.14),0 6px 16px -6px rgb(12 26 40/.55)";
  return `<div style="display:flex;align-items:center;gap:6px;padding:7px 10px 7px 8px;border-radius:999px;background:#fff;cursor:zoom-in;${ring};font:600 13px/1 'Mona Sans',system-ui,sans-serif;color:${INK};white-space:nowrap">
    <svg viewBox="0 0 36 24" width="20" height="13" aria-hidden="true"><path d="${DOG_PATH}" fill="#fff" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/></svg>${n}
  </div>`;
}

function put(m: Maplibre.Map, id: string, data: GeoJSON.GeoJSON) {
  const src = m.getSource(id) as Maplibre.GeoJSONSource | undefined;
  if (src) src.setData(data);
  else m.addSource(id, { type: "geojson", data });
}

/**
 * The walk on a map: the route the phone took, every dog where it was first seen, and the
 * places with dogs still to vaccinate ringed in amber. "Route only" hides the street map.
 */
export function WalkMap({
  route,
  dogs,
  spots,
  selected,
  hidden,
  onPick,
}: {
  route: Fix[];
  dogs: MapDog[];
  spots: MapSpot[];
  selected: number | null;
  hidden: boolean;
  onPick: (label: number) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Maplibre.Map | null>(null);
  const lib = useRef<typeof Maplibre | null>(null);
  const base = useRef<[string, "visible" | "none"][]>([]);
  const markers = useRef<Maplibre.Marker[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  }, [onPick]);

  // One map for the component's life, framed on the walk.
  useEffect(() => {
    let gone = false;
    let made: Maplibre.Map | null = null;
    (async () => {
      const ml = await import("maplibre-gl");
      if (gone || !el.current) return;
      lib.current = ml;
      try {
        made = new ml.Map({
          container: el.current,
          style: STYLE,
          bounds: bounds(route, dogs),
          fitBoundsOptions: { padding: 56, maxZoom: 18.5 },
          // The page scrolls past the map; zooming takes Ctrl or two fingers.
          cooperativeGestures: true,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
        });
      } catch {
        setFailed(true);
        return;
      }
      const m = made;
      m.touchZoomRotate.disableRotation();
      m.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right");
      m.addControl(new ml.ScaleControl({ unit: "metric" }), "bottom-left");
      m.on("load", () => {
        if (gone) return;
        base.current = m
          .getStyle()
          .layers.filter((l) => !l.id.startsWith(OURS))
          .map((l) => [l.id, (l.layout as { visibility?: "visible" | "none" } | undefined)?.visibility ?? "visible"]);
        map.current = m;
        setLoaded(true);
      });
    })();
    return () => {
      gone = true;
      markers.current.forEach((k) => k.remove());
      made?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The route, its two ends and the places to go back to.
  useEffect(() => {
    const m = map.current;
    if (!loaded || !m) return;
    put(m, `${OURS}spots`, {
      type: "FeatureCollection",
      features: spots.map((s) => ({ type: "Feature", properties: { count: s.count }, geometry: { type: "Polygon", coordinates: [ring(s.centre, s.radius)] } })),
    });
    put(m, `${OURS}route`, { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route.map((p) => [p[2], p[1]]) } });
    put(m, `${OURS}ends`, {
      type: "FeatureCollection",
      features: route.length
        ? [
            { type: "Feature", properties: { end: 0 }, geometry: { type: "Point", coordinates: [route[0][2], route[0][1]] } },
            { type: "Feature", properties: { end: 1 }, geometry: { type: "Point", coordinates: [route[route.length - 1][2], route[route.length - 1][1]] } },
          ]
        : [],
    });
    if (m.getLayer(`${OURS}route-line`)) return;
    m.addLayer({ id: `${OURS}spots-fill`, type: "fill", source: `${OURS}spots`, paint: { "fill-color": "#f0a23a", "fill-opacity": 0.22 } });
    m.addLayer({ id: `${OURS}spots-edge`, type: "line", source: `${OURS}spots`, paint: { "line-color": "#c47a06", "line-width": 2 } });
    m.addLayer({
      id: `${OURS}route-casing`,
      type: "line",
      source: `${OURS}route`,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.9 },
    });
    m.addLayer({
      id: `${OURS}route-line`,
      type: "line",
      source: `${OURS}route`,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": INK, "line-width": 4, "line-opacity": 0.9 },
    });
    m.addLayer({
      id: `${OURS}ends`,
      type: "circle",
      source: `${OURS}ends`,
      paint: { "circle-radius": 6, "circle-stroke-width": 3, "circle-stroke-color": INK, "circle-color": ["match", ["get", "end"], 0, "#ffffff", INK] },
    });
  }, [loaded, route, spots]);

  // Every dog, as a pin that opens its card. Close dogs fan out; a crowd becomes one pin that
  // zooms in when tapped. The grouping is redone at every zoom.
  useEffect(() => {
    const m = map.current;
    const ml = lib.current;
    if (!loaded || !m || !ml) return;
    const button = (node: HTMLElement, label: string, act: () => void) => {
      node.setAttribute("role", "button");
      node.setAttribute("tabindex", "0");
      node.setAttribute("aria-label", label);
      node.addEventListener("click", act);
      node.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          act();
        }
      });
    };
    const render = () => {
      markers.current.forEach((k) => k.remove());
      markers.current = [];
      const deep = m.getZoom() >= m.getMaxZoom() - 0.5;
      for (const g of groupOnScreen(dogs.map((d) => m.project(lonLat(d.at))))) {
        if (g.length >= 4 && !deep) {
          const at: [number, number] = [g.reduce((s, i) => s + dogs[i].at[1], 0) / g.length, g.reduce((s, i) => s + dogs[i].at[0], 0) / g.length];
          const node = document.createElement("div");
          node.innerHTML = clusterPin(g.length, g.filter((i) => dogs[i].status === "unmarked").length);
          button(node, `${g.length} dogs here; zoom in`, () => m.easeTo({ center: at, zoom: Math.min(m.getMaxZoom(), m.getZoom() + 2), duration: 450 }));
          markers.current.push(new ml.Marker({ element: node, anchor: "center" }).setLngLat(at).addTo(m));
          continue;
        }
        g.forEach((i, k) => {
          const d = dogs[i];
          const node = document.createElement("div");
          node.innerHTML = pin(d, d.label === selected);
          button(node, `Dog ${d.label}`, () => pick.current(d.label));
          const [dx, dy] = fanOffset(k, g.length);
          // The pin's circle, not the whole pin with its number, sits on the spot.
          markers.current.push(new ml.Marker({ element: node, anchor: "left", offset: [-17 + dx, dy] }).setLngLat(lonLat(d.at)).addTo(m));
        });
      }
    };
    render();
    m.on("zoomend", render);
    return () => {
      m.off("zoomend", render);
    };
  }, [loaded, dogs, selected]);

  useEffect(() => {
    const m = map.current;
    if (!loaded || !m) return;
    for (const [id, vis] of base.current) m.setLayoutProperty(id, "visibility", hidden ? "none" : vis);
  }, [loaded, hidden]);

  if (failed)
    return (
      <div className="flex h-[360px] w-full items-center justify-center bg-canvas-2 p-8 text-center text-[0.9375rem] text-ink-2 md:h-[440px]">
        This browser can’t draw maps. Every dog is in the list, with walking directions.
      </div>
    );
  // MapLibre adds its own classes to the element it draws in, so React must never re-render that
  // element's className; the background for "Route only" changes on the wrapper instead.
  return (
    <div className={`h-[360px] w-full transition-colors md:h-[440px] ${hidden ? "bg-canvas" : "bg-canvas-2"}`}>
      <div ref={el} className="size-full" role="region" aria-label="Map of the walk and the dogs on it" />
    </div>
  );
}
