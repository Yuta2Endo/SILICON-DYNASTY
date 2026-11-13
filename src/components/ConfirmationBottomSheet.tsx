import { useEffect, useRef } from "react";

interface ConfirmationBottomSheetProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationBottomSheet({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmationBottomSheetProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="sheet-backdrop">
      <section
        aria-describedby="confirmation-sheet-message"
        aria-labelledby="confirmation-sheet-title"
        aria-modal="true"
        className="confirmation-sheet"
        role="dialog"
      >
        <span className="sheet-handle" aria-hidden="true" />
        <h2 id="confirmation-sheet-title">{title}</h2>
        <p id="confirmation-sheet-message">{message}</p>
        <div className="confirmation-sheet__actions">
          <button className="button button--secondary" onClick={onCancel} ref={cancelButtonRef} type="button">
            {cancelLabel}
          </button>
          <button className="button button--danger" onClick={onConfirm} type="button">
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
