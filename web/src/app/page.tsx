import { regionAround } from "@/components/PhotoCrop";
import { Clipboard } from "@/components/landing/Clipboard";
import { FinalCta, Footer, People } from "@/components/landing/Closing";
import { Evidence } from "@/components/landing/Evidence";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks, type HowData } from "@/components/landing/HowItWorks";
import { Problem } from "@/components/landing/Problem";
import { Teams } from "@/components/landing/Teams";
import marks from "@/content/sam/lane-dawn-dog.marks.json";
import { loadPhotoSegmentation } from "@/lib/sam/photos";
import { chapman, coverage } from "@/lib/stats";

async function howData(): Promise<HowData> {
  const [lane, parking] = await Promise.all([loadPhotoSegmentation("lane-dawn-dog"), loadPhotoSegmentation("dogs-parking")]);
  const ear = lane.outlines["dog ear"] ?? [];
  const example = coverage(284, 112, 0);
  const pop = chapman(30, 28, 18);
  const r = marks.reading;
  return {
    lane: {
      width: lane.width,
      height: lane.height,
      ear,
      earRegion: ear[0] ? regionAround(ear[0].box, lane.width, lane.height, 3.4, 4 / 3) : { left: 0, top: 0, right: 800, bottom: 600 },
    },
    parking: { width: parking.width, height: parking.height, dogs: parking.outlines["dog"] ?? [] },
    reading: {
      reason: r.reason,
      paint: r.paint.status === "absent" ? "None" : r.paint.status === "present" ? "Present" : "Can’t see",
      ear: r.ear_notch.status === "absent" ? "None, ear intact" : r.ear_notch.status === "present" ? "Notched" : "Can’t see",
      seconds: marks.seconds,
    },
    example: { p: example.ci.p, low: example.ci.low, high: example.ci.high, marked: example.marked, unmarked: example.unmarked },
    population: { n1: 30, n2: 28, m: 18, n: pop.n, low: pop.low, high: pop.high },
  };
}

export default async function Home() {
  const data = await howData();
  return (
    <>
      <main>
        <Hero />
        <Problem />
        <Clipboard />
        <HowItWorks data={data} />
        <Evidence />
        <Teams />
        <People />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
