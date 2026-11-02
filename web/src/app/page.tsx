import { Clipboard } from "@/components/landing/Clipboard";
import { FinalCta, Footer } from "@/components/landing/Closing";
import { Evidence } from "@/components/landing/Evidence";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks, type HowData } from "@/components/landing/HowItWorks";
import { Next } from "@/components/landing/Next";
import { Paid } from "@/components/landing/Paid";
import { Possible, ZeroBy30 } from "@/components/landing/Possible";
import { Problem, Stakes } from "@/components/landing/Problem";
import { Proof } from "@/components/landing/Proof";
import { Users } from "@/components/landing/Users";
import { WhyAI } from "@/components/landing/WhyAI";
import { coverage } from "@/lib/stats";

function howData(): HowData {
  const example = coverage(284, 112, 0);
  return { example: { p: example.ci.p, low: example.ci.low, high: example.ci.high, marked: example.marked, unmarked: example.unmarked } };
}

export default async function Home() {
  const data = howData();
  return (
    <>
      <main>
        {/* 1. What it is, working. 2. Why it matters. 3. The gap today. 4. Proof the need is paid for. */}
        <Hero />
        <Stakes />
        <Problem />
        <Clipboard />
        <Paid />
        {/* 5. Why AI closes the gap, how, and proof that it does. 6. Meta's models doing the work. */}
        <WhyAI />
        <HowItWorks data={data} />
        <Proof />
        <Evidence />
        {/* 7. Who needs it, where it goes next, and the goal it serves. */}
        <Users />
        <Next />
        <Possible />
        <ZeroBy30 />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
