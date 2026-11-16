"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

/** Full-screen camera view. Always dark, regardless of theme. */
export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let cleanupControls: { stop: () => void } | null = null;

    const start = async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled || !videoRef.current) return;

        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current,
          (result, _err, ctrl) => {
            if (result && !cancelled) {
              cancelled = true;
              ctrl.stop();
              onDetectedRef.current(result.getText());
            }
          }
        );
        cleanupControls = controls;
        if (cancelled) controls.stop();
      } catch (err) {
        console.error("Barcode scanner failed to start:", err);
        if (!cancelled) setFailed(true);
      }
    };

    start();

    return () => {
      cancelled = true;
      cleanupControls?.stop();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-label="Scan barcode">
      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />

        {failed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <p className="text-base font-semibold">Camera unavailable</p>
            <p className="text-sm mt-2 text-white/70">
              Allow camera access for this site, then try again.
            </p>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6">
            {/* The huge spread shadow dims everything outside the frame */}
            <div
              className="relative w-full max-w-sm aspect-[5/3] rounded-2xl border-2 border-white/90"
              style={{ boxShadow: "0 0 0 100vmax rgba(0,0,0,0.6)" }}
            >
              <div
                className="absolute scan-line left-3 right-3 h-0.5 rounded-full"
                style={{ background: "#5cc096" }}
              />
            </div>
            <p className="relative mt-6 text-sm font-medium text-white/85">
              Line the barcode up inside the frame
            </p>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+20px)] bg-black">
        <button
          onClick={onClose}
          className="w-full max-w-sm mx-auto block h-12 rounded-xl text-base font-semibold bg-white/15 hover:bg-white/25 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
