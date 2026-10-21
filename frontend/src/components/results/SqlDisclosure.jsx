import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { copyText } from "@/lib/session";
import { useAnnounce } from "@/components/StatusRegion";

export function SqlDisclosure({ sql, testId }) {
  const announce = useAnnounce();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const copy = async () => {
    const ok = await copyText(sql);
    const m = ok ? "SQL copied" : "Couldn't copy. Select the SQL to copy it.";
    setMsg(m);
    announce(m);
  };
  return (
    <div className="dk-sql">
      <button
        type="button"
        className="dk-btn dk-btn-small dk-disclosure"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        data-testid={`${testId}-toggle`}
      >
        <ChevronDown aria-hidden="true" size={16} className={open ? "dk-chevron-open" : undefined} />
        {open ? "Hide SQL" : "View SQL"}
      </button>
      <div id={id} hidden={!open} className="dk-sql-panel">
        <p className="dk-support dk-sql-title">SQL used for this result</p>
        <pre className="dk-sql-code" tabIndex={0} aria-label="SQL used for this result" data-testid={`${testId}-code`}>
          <code>{sql}</code>
        </pre>
        <div className="dk-sql-actions">
          <button type="button" className="dk-btn dk-btn-small" onClick={copy} data-testid={`${testId}-copy`}>Copy SQL</button>
          <span className="dk-support" aria-hidden="true" data-testid={`${testId}-copy-msg`}>{msg}</span>
        </div>
      </div>
    </div>
  );
}
