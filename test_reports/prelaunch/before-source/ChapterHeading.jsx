import { useRef } from "react";
import { useRevealOnce } from "./useVisiblePlayback";

export const ChapterHeading = ({ eyebrow, title, support, id, row, children, testid }) => {
  const ref = useRef(null);
  const shown = useRevealOnce(ref, 0.2);
  const cls = shown ? "is-in" : "";
  return (
    <div ref={ref} className={`ph-chapter-head ${row ? "ph-chapter-head--row" : ""}`} data-testid={testid}>
      <div>
        {eyebrow && <p className={`ph-eyebrow ph-reveal-label ${cls}`}>{eyebrow}</p>}
        <h2 id={id} tabIndex={-1} className={`ph-h2 ph-reveal-head ${cls}`}>
          {title}
        </h2>
        {support && <p className={`ph-support ph-reveal-support ${cls}`}>{support}</p>}
      </div>
      {children}
    </div>
  );
};
