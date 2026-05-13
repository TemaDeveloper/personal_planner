import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Hero } from "@/components/landing/hero";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { HowItWorks } from "@/components/landing/how-it-works";
import { CTASection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--background)" }}>
      <Hero />
      <FeaturesGrid />
      <HowItWorks />
      <CTASection />
      <Footer />
    </main>
  );
}
