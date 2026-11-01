import { describe, expect, it } from "vitest";
import { classify } from "./marks";

const tri = (status: "present" | "absent" | "not_visible") => ({ status });
const reading = (over: Record<string, unknown> = {}) =>
  ({
    is_dog: true,
    paint: { ...tri("absent"), color: null, location: null },
    collar: { ...tri("absent"), color: null },
    ear_notch: { ...tri("absent"), side: null },
    ear_tag: { ...tri("absent"), color: null },
    view_quality: "good",
    ...over,
  }) as Parameters<typeof classify>[0];

describe("classify", () => {
  it("reads only the mark the team used", () => {
    const r = reading({ collar: { status: "present", color: "purple" } });
    expect(classify(r, "vaccination", ["paint"]).status).toBe("unmarked");
    expect(classify(r, "vaccination", ["collar"])).toEqual({ status: "marked", kind: "collar" });
  });

  it("marks a dog with a visible ear tag in an ear-tag survey", () => {
    expect(classify(reading({ ear_tag: { status: "present", color: "yellow" } }), "vaccination", ["ear_tag"])).toEqual({ status: "marked", kind: "ear_tag" });
  });

  it("can't call a dog whose ears are hidden in an ear-tag survey", () => {
    expect(classify(reading({ ear_tag: { status: "not_visible", color: null } }), "vaccination", ["ear_tag"]).status).toBe("unknown");
  });

  it("treats a reading made before ear tags were asked about as can't tell", () => {
    const old = reading();
    delete (old as { ear_tag?: unknown }).ear_tag;
    expect(classify(old, "vaccination", ["ear_tag"]).status).toBe("unknown");
  });

  it("never calls a poor view unmarked", () => {
    expect(classify(reading({ view_quality: "poor" }), "vaccination", ["paint"]).status).toBe("unknown");
  });

  it("reads sterilization from the ear notch alone", () => {
    expect(classify(reading({ ear_notch: { status: "present", side: "right" } }), "sterilization", []).kind).toBe("notch");
    expect(classify(reading({ is_dog: false }), "sterilization", []).status).toBe("unknown");
  });
});

describe("second opinion", () => {
  it("sends a dog to a person when SAM and Muse Spark disagree about a collar", () => {
    const r = reading({ collar: { status: "present", color: "red" }, second: { collar: { found: false, conf: null } } });
    expect(classify(r, "vaccination", ["collar"]).status).toBe("unknown");
  });

  it("keeps the reading when both models agree", () => {
    const r = reading({ collar: { status: "present", color: "red" }, second: { collar: { found: true, conf: 0.6 } } });
    expect(classify(r, "vaccination", ["collar"])).toEqual({ status: "marked", kind: "collar" });
  });

  it("ignores a second opinion on a mark the walk doesn't count", () => {
    const r = reading({ collar: { status: "present", color: "red" }, second: { collar: { found: false, conf: null } } });
    expect(classify(r, "vaccination", ["paint"]).status).toBe("unmarked");
  });
});
