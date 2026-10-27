import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { previewState, previewBus, previewApi } from "@/preview/previewApi";
import { QUERY_FIXTURES, HTTP_SCENARIOS, CANONICAL_QUESTION } from "@/preview/fixtures";

const OPTIONS = {
  login: ["success", "401", "429", "network"],
  sources: ["single", "long-name", "none", "multiple", "failure"],
  query: [...Object.keys(QUERY_FIXTURES), "session-mismatch", ...Object.keys(HTTP_SCENARIOS), "network"],
  wait: ["normal", "long"],
  logout: ["success", "fail"],
};
const LABELS = {
  login: "Sign-in result",
  sources: "Data sources",
  query: "Next question response",
  wait: "Response delay",
  logout: "Sign-out result",
};

function Field({ name, onChange }) {
  const [value, setValue] = useState(previewState[name]);
  const id = `preview-${name}`;
  return (
    <div className="dk-preview-field">
      <label htmlFor={id}>{LABELS[name]}</label>
      <select
        id={id}
        data-testid={`preview-select-${name}`}
        value={value}
        onChange={(e) => {
          previewState[name] = e.target.value;
          setValue(e.target.value);
          onChange?.();
        }}
      >
        {OPTIONS[name].map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

export function PreviewControls({ scope, testId }) {
  const [copied, setCopied] = useState(false);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button type="button" className="dk-preview-trigger" data-testid={testId}>
          Preview tools
        </button>
      </SheetTrigger>
      <SheetContent className="dk-preview-sheet" data-testid="preview-controls-panel">
        <SheetHeader>
          <SheetTitle>Preview tools</SheetTitle>
          <SheetDescription>Development-only sample states. Nothing here is live data.</SheetDescription>
        </SheetHeader>
        <div className="dk-preview-fields">
          <Field name="login" />
          {scope === "app" && (
            <>
              <Field
                name="sources"
                onChange={() => {
                  previewApi.resetSourceRemoval();
                  previewBus.emit("reloadSources");
                }}
              />
              <Field name="query" />
              <Field name="wait" />
              <Field name="logout" />
              <button type="button" className="dk-btn" data-testid="preview-inactivity-button" onClick={() => previewBus.emit("inactivity")}>
                Simulate one hour of inactivity
              </button>
              <button
                type="button"
                className="dk-btn"
                data-testid="preview-canonical-question-button"
                onClick={() => {
                  previewBus.emit("canonicalQuestion");
                  setCopied(true);
                }}
              >
                Put canonical question in draft
              </button>
              {copied && <p className="dk-support">Canonical question placed in the composer: “{CANONICAL_QUESTION.slice(0, 40)}…”</p>}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
