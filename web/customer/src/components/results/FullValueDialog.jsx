import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { copyText } from "@/lib/session";
import { useAnnounce } from "@/components/StatusRegion";

export function FullValueDialog({ data, onClose }) {
  const announce = useAnnounce();
  const [copyMsg, setCopyMsg] = useState("");
  const copy = async () => {
    const ok = await copyText(data.value);
    const msg = ok ? "Value copied" : "Couldn't copy. Select the value to copy it.";
    setCopyMsg(msg);
    announce(msg);
  };
  return (
    <Dialog.Root open={Boolean(data)} onOpenChange={(o) => { if (!o) { setCopyMsg(""); onClose(); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="dk-overlay" />
        {data && (
          <Dialog.Content className="dk-dialog dk-dialog-wide" data-testid="full-value-dialog">
            <Dialog.Title className="dk-dialog-title">{data.title}</Dialog.Title>
            <Dialog.Description className="dk-dialog-desc">
              {data.subtitle}
              {data.base64 ? " · Base64 representation" : ""}
            </Dialog.Description>
            <pre className="dk-full-value" tabIndex={0} data-testid="full-value-text">{data.value}</pre>
            <div className="dk-dialog-actions">
              <span className="dk-support" aria-hidden="true">{copyMsg}</span>
              <button type="button" className="dk-btn" onClick={copy} data-testid="full-value-copy-button">Copy value</button>
              <Dialog.Close className="dk-btn dk-btn-primary" data-testid="full-value-close-button">Close</Dialog.Close>
            </div>
          </Dialog.Content>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}
