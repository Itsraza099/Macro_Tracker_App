"use client";

import { useEffect, useState } from "react";
import { CircleCheck, CircleAlert, X } from "lucide-react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 200);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const Icon = type === "success" ? CircleCheck : CircleAlert;

  return (
    <div
      className="fixed z-[60] inset-x-4 md:left-60 bottom-[calc(env(safe-area-inset-bottom)+76px)] md:bottom-6 flex justify-center pointer-events-none"
      role={type === "error" ? "alert" : "status"}
    >
      <div
        className={`pointer-events-auto w-full max-w-sm flex items-center gap-3 rounded-2xl bg-ink text-bg pl-4 pr-2 py-2 shadow-pop ${
          isExiting ? "fade-out" : "rise"
        }`}
      >
        <Icon
          size={18}
          className="flex-shrink-0"
          style={{ color: type === "success" ? "var(--brand-soft)" : "var(--danger-soft)" }}
        />
        <p className="text-sm font-medium flex-1 min-w-0 break-words">{message}</p>
        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(onClose, 200);
          }}
          className="flex items-center justify-center w-9 h-9 rounded-lg opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
