import * as AlertDialog from "@radix-ui/react-alert-dialog";

export function ConfirmDialog({ open, title, description, cancelLabel, confirmLabel, onCancel, onConfirm, testId }) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dk-overlay" />
        <AlertDialog.Content className="dk-dialog" data-testid={testId}>
          <AlertDialog.Title className="dk-dialog-title">{title}</AlertDialog.Title>
          {description ? (
            <AlertDialog.Description className="dk-dialog-desc">{description}</AlertDialog.Description>
          ) : (
            <AlertDialog.Description className="sr-only">{title}</AlertDialog.Description>
          )}
          <div className="dk-dialog-actions">
            <AlertDialog.Cancel className="dk-btn" data-testid={`${testId}-cancel`}>{cancelLabel}</AlertDialog.Cancel>
            <AlertDialog.Action className="dk-btn dk-btn-primary" onClick={onConfirm} data-testid={`${testId}-confirm`}>
              {confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
