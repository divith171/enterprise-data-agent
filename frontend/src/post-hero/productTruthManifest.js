// Internal engineering document. Never render these values as marketing copy.
// This standalone workspace has no backend; nothing here is code evidence of security behavior.
export const productTruthManifest = Object.freeze({
  workspace: "standalone-frontend",
  routes: {
    landing: "/",
    getStarted: "/signup",
    signIn: "/login",
  },
  onboardingVerified: false, // keeps the locked fallback "Start with DataKat."
  securityClaims: {
    conceptual: true,
    label: "Conceptual access path · sample request",
    gates: ["Authenticated access", "Query rate limit", "Source ownership", "Tenant-aware routing", "SQL validation", "Company-owned source"],
    orderVerified: false,
  },
  protectedHero: [
    "src/components/landing/Hero.jsx",
    "src/components/landing/Navbar.jsx",
    "src/components/landing/Reveal.jsx",
    "src/lib/scroll.js",
    "public/media/datakat-hero.mp4",
    "public/media/datakat-hero.webm",
    "public/media/hero-poster.webp",
    "src/assets/datakat-wordmark.png",
  ],
  baselineReference: "/app/memory/baseline/hero-hashes-before.txt",
});

export const onboardingLabel = productTruthManifest.onboardingVerified
  ? "Connect your data after signing in."
  : "Start with DataKat.";
