import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Lenis from "lenis";
import { Navbar } from "../components/landing/Navbar";
import { Hero } from "../components/landing/Hero";
import { ProductDemo } from "../components/landing/ProductDemo";
import { HowItWorks } from "../components/landing/HowItWorks";
import { BusinessQuestions } from "../components/landing/BusinessQuestions";
import { TechPipeline } from "../components/landing/TechPipeline";
import { SecuritySection } from "../components/landing/SecuritySection";
import { Differentiation } from "../components/landing/Differentiation";
import { FinalCTA } from "../components/landing/FinalCTA";
import { Footer } from "../components/landing/Footer";
import { scrollToHash } from "../lib/scroll";

export default function Landing() {
  const location = useLocation();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }
    const lenis = new Lenis({ lerp: 0.09 });
    window.__lenis = lenis;
    let raf = 0;
    const loop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      window.__lenis = null;
    };
  }, []);

  useEffect(() => {
    if (location.hash) {
      const t = setTimeout(() => scrollToHash(location.hash)(), 200);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
    return undefined;
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-screen bg-abyss font-sans text-ink">
      <a
        href="#product"
        data-testid="skip-link"
        onClick={scrollToHash("#product")}
        className="skip-link rounded-full bg-brand px-4 py-2 text-sm font-medium text-abyss"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main-content">
        <Hero />
        <ProductDemo />
        <HowItWorks />
        <BusinessQuestions />
        <TechPipeline />
        <SecuritySection />
        <Differentiation />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
