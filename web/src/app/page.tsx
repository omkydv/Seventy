import { Clipboard } from "@/components/landing/Clipboard";
import { FinalCta, Footer } from "@/components/landing/Closing";
import { Evidence } from "@/components/landing/Evidence";
import { FieldKit } from "@/components/landing/FieldKit";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks, type HowData } from "@/components/landing/HowItWorks";
import { OneDog } from "@/components/landing/OneDog";
import { Paid } from "@/components/landing/Paid";
import { Possible, ZeroBy30 } from "@/components/landing/Possible";
import { Problem, Stakes } from "@/components/landing/Problem";
import { Proof } from "@/components/landing/Proof";
import { UnderTheHood } from "@/components/landing/UnderTheHood";
import { Users } from "@/components/landing/Users";
import { WhyAI } from "@/components/landing/WhyAI";
import { DESCRIPTION, SITE } from "@/lib/site";
import { coverage } from "@/lib/stats";

function howData(): HowData {
  const example = coverage(284, 112, 0);
  return { example: { p: example.ci.p, low: example.ci.low, high: example.ci.high, marked: example.marked, unmarked: example.unmarked } };
}

// What search engines and link previews read about the product.
const structured = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Seventy",
  url: SITE,
  description: DESCRIPTION,
  applicationCategory: "HealthApplication",
  operatingSystem: "Any phone or computer with a modern web browser",
  image: `${SITE}/og.jpg`,
  featureList: [
    "Counts every dog in a phone video once, with Meta SAM 3.1 video tracking",
    "Reads paint, collar, ear tag and ear notch marks with Meta Muse Spark, with SAM 3.1 as a second opinion",
    "Vaccination coverage against the WHO 70% target, with a 95% interval",
    "Records the walk in the browser with its GPS route and maps the dogs still to vaccinate",
    "Pixelates every person in the footage",
    "Writes a cited programme report with Meta Muse Wonder",
  ],
};

export default async function Home() {
  const data = howData();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }} />
      <main>
        {/* 1. What it is, working. 2. Why it matters. 3. The gap today. 4. Proof the need is paid for. */}
        <Hero />
        <Stakes />
        <Problem />
        <Clipboard />
        <Paid />
        {/* 5. Why AI closes the gap, and how. 6. The product in a surveyor's hand. 7. Proof that it works. */}
        <WhyAI />
        <HowItWorks data={data} />
        <FieldKit />
        <Proof />
        {/* 8. Meta's models doing the work: the overview, one dog in full, and the engineering around them. */}
        <Evidence />
        <OneDog />
        <UnderTheHood />
        {/* 9. Who needs it, where it goes next, and the goal it serves. */}
        <Users />
        <Possible />
        <ZeroBy30 />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
