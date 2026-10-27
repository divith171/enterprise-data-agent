import { liveApi } from "@/api/liveApi";

let api = liveApi;
let previewBus = null;
let PreviewControls = null;

// Development-only fixtures. The literal NODE_ENV check lets production builds drop this branch entirely.
if (process.env.NODE_ENV !== "production" && process.env.REACT_APP_DATAKAT_PREVIEW === "true") {
  const preview = require("@/preview");
  api = preview.previewApi;
  previewBus = preview.previewBus;
  PreviewControls = preview.PreviewControls;
}

export const IS_PREVIEW = previewBus !== null;
export { api, previewBus, PreviewControls };
