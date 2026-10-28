import type { Metadata } from "next";
import { NewWalkForm } from "./NewWalkForm";

export const metadata: Metadata = { title: "New survey" };

export default function NewWalkPage() {
  return (
    <main className="shell py-12 md:py-16">
      <div className="grid grid-cols-12 gap-y-12 lg:gap-x-10">
        <div className="col-span-12 lg:col-span-8">
          <h1 className="display text-4xl md:text-5xl">New survey</h1>
          <p className="mt-3 max-w-2xl text-lg text-ink-2">
            Add one walk. The original video stays on this device; a small copy, five frames a second, is sent for counting.
          </p>
          <NewWalkForm />
        </div>
        <aside className="col-span-12 lg:col-span-4">
          <div className="panel p-6 lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold tracking-[-0.01em]">Filming a good walk</h2>
            <ul className="mt-4 space-y-3 text-[0.9375rem] text-ink-2">
              <li>Go early, between 6:30 and 8:00, when dogs are out and the light is soft.</li>
              <li>Hold the phone sideways at chest height and walk slowly.</li>
              <li>When a dog is close and side-on, pause for two or three seconds so its ears can be read.</li>
              <li>Keep your distance. Never approach, feed or chase a dog.</li>
              <li>Point the camera at the street, not at people. Never film at night.</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
