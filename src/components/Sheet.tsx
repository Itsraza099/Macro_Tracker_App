"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface Props {
  title: string;
  eyebrow?: string;
  /** Plays the exit animation while the parent waits to unmount */
  closing?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/** Bottom sheet on phones, centred dialog from 640px up. */
export default function Sheet({ title, eyebrow, closing = false, onClose, children }: Props) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
      <div
        className={`absolute inset-0 ${closing ? "fade-out" : "fade"}`}
        style={{ background: "var(--scrim)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto bg-surface border border-line rounded-t-3xl sm:rounded-3xl shadow-pop px-5 pt-3 sm:pt-6 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:pb-6 ${
          closing ? "sheet-out" : "sheet-in"
        }`}
      >
        <div className="sm:hidden w-9 h-1 rounded-full bg-line-strong mx-auto mb-4" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
            <h2 className="text-lg font-semibold leading-snug text-ink">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-icon -mr-2 -mt-1"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
