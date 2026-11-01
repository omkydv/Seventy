import { redirect } from "next/navigation";
import samples from "@/content/samples.json";

/** The sample survey judges and visitors land on: the mountain village count. */
export default function DemoPage() {
  redirect(`/app/walks/${samples.samples[0].walk}`);
}
