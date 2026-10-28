import type { Metadata } from "next";
import { WalkView } from "./WalkView";

export const metadata: Metadata = { title: "Walk" };

export default async function WalkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WalkView id={id} />;
}
