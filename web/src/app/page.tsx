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
        <Hero />
        <Stakes />
        <Problem />
        <ZeroBy30 />
        <Clipboard />
        <Paid />
        <WhyAI />
        <HowItWorks data={data} />
        <Evidence />
        <Proof />
        <Users />
        <Possible />
        <Next />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
