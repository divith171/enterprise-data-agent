// Preview helper only; empty outside development preview mode.
export const CANONICAL_QUESTION =
  process.env.NODE_ENV !== "production" && process.env.REACT_APP_DATAKAT_PREVIEW === "true"
    ? require("@/preview/fixtures").CANONICAL_QUESTION
    : "";
