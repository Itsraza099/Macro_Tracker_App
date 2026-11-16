"use client";

import { useState } from "react";
import type { PendingLog } from "@/lib/types";
import Sheet from "@/components/Sheet";

interface Props {
  pending: PendingLog;
  isExiting: boolean;
  isSubmitting: boolean;
  onConfirm: (log: PendingLog) => Promise<void>;
  onDiscard: () => void;
}

const MACRO_FIELDS = [
  { key: "calories" as const, label: "Calories", unit: "kcal", color: "var(--brand)", step: "1" },
  { key: "protein" as const, label: "Protein", unit: "g", color: "var(--protein)", step: "0.1" },
  { key: "carbs" as const, label: "Carbs", unit: "g", color: "var(--carbs)", step: "0.1" },
  { key: "fat" as const, label: "Fat", unit: "g", color: "var(--fat)", step: "0.1" },
] as const;

export default function LogDrawer({ pending, isExiting, isSubmitting, onConfirm, onDiscard }: Props) {
  const [foodName, setFoodName] = useState(pending.food_name);
  const [values, setValues] = useState({
    calories: String(pending.calories),
    protein: String(Number(pending.protein).toFixed(1)),
    carbs: String(Number(pending.carbs).toFixed(1)),
    fat: String(Number(pending.fat).toFixed(1)),
  });

  const set = (key: keyof typeof values) => (v: string) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const handleConfirm = () =>
    onConfirm({
      ...pending,
      food_name: foodName,
      calories: Number(values.calories),
      protein: Number(values.protein),
      carbs: Number(values.carbs),
      fat: Number(values.fat),
    });

  return (
    <Sheet title="Check before logging" closing={isExiting} onClose={onDiscard}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isSubmitting) handleConfirm();
        }}
      >
        <label className="field-label" htmlFor="log-food-name">
          Food
        </label>
        <input
          id="log-food-name"
          type="text"
          value={foodName}
          onChange={(e) => setFoodName(e.target.value)}
          className="field mb-4"
        />

        <div className="grid grid-cols-2 gap-3 mb-6">
          {MACRO_FIELDS.map(({ key, label, unit, color, step }) => (
            <label
              key={key}
              className="block rounded-2xl border border-line bg-bg px-3.5 py-3 focus-within:border-brand transition-colors"
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-2 mb-1">
                <span className="w-2 h-2 rounded-full" style={{ background: color }} aria-hidden="true" />
                {label}
              </span>
              <span className="flex items-baseline gap-1">
                <input
                  type="number"
                  inputMode="decimal"
                  step={step}
                  value={values[key]}
                  onChange={(e) => set(key)(e.target.value)}
                  className="num w-full min-w-0 bg-transparent outline-none text-2xl font-semibold text-ink"
                />
                <span className="text-xs font-medium text-ink-3 flex-shrink-0">{unit}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={onDiscard} disabled={isSubmitting} className="btn btn-secondary flex-1">
            Discard
          </button>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-[2]">
            {isSubmitting ? "Logging…" : "Confirm & log"}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
