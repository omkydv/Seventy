import { Hero } from "@/components/site/Hero";
import {
  FinalCta,
  HowSection,
  ModelsSection,
  ModesSection,
  NumberSection,
  PrivacySection,
  TodaySection,
} from "@/components/site/Sections";
import { SiteFooter } from "@/components/site/SiteFooter";

export default async function Home() {
  return (
    <>
      <main>
        <Hero />
        <NumberSection />
        <TodaySection />
        <HowSection />
        <ModesSection />
        <ModelsSection />
        <PrivacySection />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
