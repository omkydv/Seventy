import type { Metadata } from "next";
import samples from "@/content/samples.json";
import { WalkView } from "./WalkView";

// Sample surveys are public and get a real title and summary; anyone else's walk stays generic.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = samples.samples.find((x) => x.walk === id);
  if (!s) return { title: "Survey", robots: { index: false } };
  const description = `${s.place}, ${s.seconds} seconds. ${s.line} Every dog counted once by Meta’s SAM 3.1, each mark read by Muse Spark.`;
  return {
    title: `${s.title}, a real survey`,
    description,
    alternates: { canonical: `/app/walks/${id}` },
    openGraph: { title: `${s.title}: ${s.seventy} dogs, each counted once`, description, url: `/app/walks/${id}`, images: [`/samples/${s.slug}.jpg`] },
  };
}

export default async function WalkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WalkView id={id} />;
}
