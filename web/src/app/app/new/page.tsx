import type { Metadata } from "next";
import { NewWalkForm } from "./NewWalkForm";

export const metadata: Metadata = { title: "New walk" };

export default function NewWalkPage() {
  return (
    <main className="shell py-12 md:py-16">
      <div className="grid grid-cols-12 gap-x-6">
        <div className="col-span-12 lg:col-span-7">
          <p className="label">New walk</p>
          <h1 className="display mt-3 text-5xl md:text-6xl">Add a walk.</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-2">
            Film a slow walk through the area, then add the video here. The original stays on this device. A small copy,
            five frames a second, is sent for counting.
          </p>
          <NewWalkForm />
        </div>
        <aside className="col-span-12 mt-12 lg:col-span-4 lg:col-start-9 lg:mt-24">
          <p className="label mb-3">Filming a good walk</p>
          <ul className="divide-y divide-line border-y border-line text-sm text-ink-2">
            <li className="py-3">Early morning, 6:30 to 8:00. Dogs are out and the light is soft.</li>
            <li className="py-3">Hold the phone sideways at chest height and walk slowly.</li>
            <li className="py-3">Pause two or three seconds when a dog is close and side-on, so its ears can be read.</li>
            <li className="py-3">Keep your distance. Never approach, feed or chase a dog.</li>
            <li className="py-3">Point the camera at the street, not at people.</li>
          </ul>
        </aside>
      </div>
    </main>
  );
}
