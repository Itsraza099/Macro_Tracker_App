"use client";

import { useState } from "react";
import { Info, RotateCcw } from "lucide-react";
import { installDemoApi } from "@/lib/demo/install";
import { resetDb } from "@/lib/demo/store";

// Runs at module load, before any page effect fetches data.
installDemoApi();

/** Thin banner explaining the demo, with a way to restore the sample data. */
export default function DemoRuntime() {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="md:pl-56">
      <div className="flex items-center gap-2 px-4 sm:px-6 lg:px-10 py-2 bg-surface-2 border-b border-line text-xs text-ink-2">
        <Info size={14} className="flex-shrink-0 text-ink-3" />
        <p className="flex-1 min-w-0">
          <span className="font-semibold text-ink">Demo.</span> Data stays in this browser. Food parsing is
          rule-based and label scans return sample values.
        </p>
        {confirming ? (
          <span className="flex items-center gap-1 flex-shrink-0">
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                resetDb();
                window.location.reload();
              }}
            >
              Reset
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
              Keep
            </button>
          </span>
        ) : (
          <button className="btn btn-ghost btn-sm flex-shrink-0" onClick={() => setConfirming(true)}>
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Reset sample data</span>
          </button>
        )}
      </div>
    </div>
  );
}
