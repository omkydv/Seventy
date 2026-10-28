import type { Metadata } from "next";
import { WalkList } from "./WalkList";

export const metadata: Metadata = { title: "Surveys" };

export default function AppHome() {
  return (
    <main className="shell py-12 md:py-16">
      <div className="max-w-2xl">
        <h1 className="display text-4xl md:text-5xl">Surveys</h1>
        <p className="mt-3 text-lg text-ink-2">
          Each survey is one walk. Open one to see every dog, the coverage against the 70% line, and the report.
        </p>
      </div>
      <WalkList />
    </main>
  );
}
