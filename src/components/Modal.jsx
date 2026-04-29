import { useEffect, useId } from "react";

/**
 * Accessible overlay dialog. Locks body scroll while open; Escape and backdrop close.
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {boolean} [props.closeOnOverlayClick]
 * @param {string} [props.title]
 * @param {import('react').ReactNode} props.children
 */
export function Modal({ open, onClose, closeOnOverlayClick = true, title, children }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-hidden={false}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={closeOnOverlayClick ? onClose : undefined}
        role="presentation"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className="relative z-10 max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          {title ? (
            <h2
              id={titleId}
              className="pr-8 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
            >
              {title}
            </h2>
          ) : (
            <span className="sr-only" id={titleId}>
              Dialog
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="-m-1 shrink-0 rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Close"
          >
            <span aria-hidden className="text-xl leading-none">
              ×
            </span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
