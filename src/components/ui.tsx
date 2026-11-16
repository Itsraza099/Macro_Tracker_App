import { Database, Camera, ScanBarcode, Sparkles } from "lucide-react";

/** Page title block shared by every screen. */
export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-4 flex-wrap mb-6">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="display text-[40px] sm:text-5xl text-ink">{title}</h1>
      </div>
      {action}
    </header>
  );
}

/** Calorie ring: thick stroke, number in the middle. */
export function CalorieRing({
  calories,
  target,
  ready,
}: {
  calories: number;
  target: number;
  ready: boolean;
}) {
  const pct = target > 0 ? Math.min(1, calories / target) : 0;
  const over = calories > target;
  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <div
      className="relative w-36 h-36 sm:w-40 sm:h-40 flex-shrink-0"
      role="img"
      aria-label={`${calories} of ${target} kilocalories eaten`}
    >
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke={over ? "var(--danger)" : "var(--brand)"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={ready ? C * (1 - pct) : C}
          style={{
            transition: "stroke-dashoffset 0.9s cubic-bezier(0.2, 0.7, 0.2, 1)",
            opacity: ready && pct > 0 ? 1 : 0,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="display num text-[40px] sm:text-[44px] text-ink">
          {calories.toLocaleString()}
        </span>
        <span className="text-[11px] font-medium text-ink-3 mt-1">kcal eaten</span>
      </div>
    </div>
  );
}

/** One macro: label, value against target, progress bar. */
export function MacroBar({
  label,
  value,
  target,
  color,
  ready,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  ready: boolean;
}) {
  const pct = target > 0 ? value / target : 0;
  const over = pct > 1;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="w-2 h-2 rounded-full" style={{ background: color }} aria-hidden="true" />
          {label}
        </span>
        <span className="num text-sm text-ink-2">
          <span className="font-semibold text-ink">{value.toFixed(0)}</span> / {target} g
          {over && (
            <span className="chip ml-2 bg-brand-soft text-brand">+{Math.round(value - target)} g</span>
          )}
        </span>
      </div>
      <div
        className="h-2 rounded-full bg-surface-2 overflow-hidden"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.round(value)}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: ready ? `${Math.min(1, pct) * 100}%` : "0%",
            background: color,
            transition: "width 0.9s cubic-bezier(0.2, 0.7, 0.2, 1)",
          }}
        />
      </div>
    </div>
  );
}

/** How an entry was logged. */
export function SourceChip({ via }: { via: string }) {
  const { label, Icon } =
    via === "dictionary"
      ? { label: "Saved", Icon: Database }
      : via === "vision_label"
        ? { label: "Label", Icon: Camera }
        : via === "barcode"
          ? { label: "Barcode", Icon: ScanBarcode }
          : { label: "Estimate", Icon: Sparkles };
  return (
    <span className="chip flex-shrink-0">
      <Icon size={11} strokeWidth={2.2} />
      {label}
    </span>
  );
}

/** Compact "P 32 · C 40 · F 12" line used in lists. */
export function MacroLine({
  protein,
  carbs,
  fat,
  digits = 0,
}: {
  protein: number;
  carbs: number;
  fat: number;
  digits?: number;
}) {
  const items = [
    { k: "P", v: protein, c: "var(--protein)" },
    { k: "C", v: carbs, c: "var(--carbs)" },
    { k: "F", v: fat, c: "var(--fat)" },
  ];
  return (
    <span className="num inline-flex items-center gap-3 text-xs text-ink-2">
      {items.map(({ k, v, c }) => (
        <span key={k} className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} aria-hidden="true" />
          {k} {Number(v).toFixed(digits)}
        </span>
      ))}
    </span>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {hint && <p className="text-sm text-ink-3 mt-1">{hint}</p>}
    </div>
  );
}
