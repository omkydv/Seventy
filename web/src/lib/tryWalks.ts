/**
 * The walks a visitor can run through the real pipeline without filming anything. Each has an
 * answer from a person counting the clip or checking the close-ups, so a run can be held against it.
 */
export type TryWalk = {
  slug: string;
  file: string;
  thumb: string;
  title: string;
  seconds: number;
  /** The answer to check a run against. */
  known: string;
  line: string;
  mode: "plan" | "check";
  mark?: "collar";
  /** Frames a second to track, when the walk's hand-checked run used more than the usual five. */
  fps?: number;
};

export const TRY_WALKS: TryWalk[] = [
  {
    slug: "market-street",
    file: "market-street.mp4",
    thumb: "/samples/market-street.jpg",
    title: "Market street",
    seconds: 6,
    known: "4 dogs, counted by hand",
    line: "Dogs close to the lens and a crowd behind them. Every person is blurred.",
    mode: "plan",
  },
  {
    slug: "city-road",
    file: "road-walk.mp4",
    thumb: "/samples/road-walk.jpg",
    title: "City road",
    seconds: 6,
    known: "3 dogs, one of them tiny",
    line: "We wrote two dogs on this clip. SAM 3.1 kept finding a third, so we looked: a dog far down the road, 24 pixels tall.",
    mode: "plan",
  },
  {
    slug: "village-lane",
    file: "village-lane.mp4",
    thumb: "/samples/village-lane.jpg",
    title: "Village lane",
    seconds: 16,
    known: "2 dogs, counted by hand",
    line: "A quiet lane, and a child passing who gets blurred.",
    mode: "plan",
  },
  {
    slug: "mountain-village",
    file: "mountain-village.mp4",
    thumb: "/samples/mountain-village.jpg",
    title: "Mountain village",
    seconds: 20,
    known: "13 dogs, counted by hand",
    line: "A pack crossing a square, all around the camera.",
    mode: "plan",
    fps: 10,
  },
  {
    slug: "rainy-street",
    file: "rainy-street.mp4",
    thumb: "/samples/rainy-street.jpg",
    title: "Rainy street",
    seconds: 9,
    known: "2 dogs, both wearing collars",
    line: "A check after a drive. Muse Spark reads each collar, and SAM 3.1 looks for it again on its own.",
    mode: "check",
    mark: "collar",
  },
];

export const DEFAULT_TRY = "market-street";

export const findTryWalk = (slug: string | null) => TRY_WALKS.find((w) => w.slug === slug) ?? TRY_WALKS.find((w) => w.slug === DEFAULT_TRY)!;
