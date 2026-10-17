import { useState } from "react";
import "./postHero.css";
import { DEFAULT_EXAMPLE_ID } from "./demoFixtures";
import { MotionPolicyProvider, useMotionPolicy } from "./motionPolicy";
import { ProductDemo } from "./ProductDemo";
import { ProcessStory } from "./ProcessStory";
import { AnalysisWorkbench } from "./AnalysisWorkbench";
import { ControlledAccess } from "./ControlledAccess";
import { ClosingComposition } from "./ClosingComposition";

const Chapters = () => {
  const [activeExampleId, setActiveExampleId] = useState(DEFAULT_EXAMPLE_ID);
  const { effectiveMotion } = useMotionPolicy();
  return (
    <div className={`ph ${effectiveMotion ? "ph-motion" : ""}`} data-testid="post-hero">
      <div className="ph-stack">
        <ProductDemo />
        <ProcessStory />
        <AnalysisWorkbench activeExampleId={activeExampleId} setActiveExampleId={setActiveExampleId} />
        <ControlledAccess activeExampleId={activeExampleId} />
        <ClosingComposition activeExampleId={activeExampleId} />
      </div>
    </div>
  );
};

export const PostHeroExperience = () => (
  <MotionPolicyProvider>
    <Chapters />
  </MotionPolicyProvider>
);
