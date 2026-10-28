import type { Metadata } from "next";
import { WalkList } from "./WalkList";

export const metadata: Metadata = { title: "Walks" };

export default function AppHome() {
  return (
    <main className="shell py-12 md:py-16">
      <p className="label">Walks</p>
      <h1 className="display mt-3 text-5xl md:text-6xl">Your walks</h1>
      <WalkList />
    </main>
  );
}
