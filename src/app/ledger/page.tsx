"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Trash2 } from "lucide-react";
import type { FoodLogEntry } from "@/lib/types";
import { todayStr, shiftDate, formatDate, sumLogs } from "@/lib/dates";
import Toast from "@/components/Toast";
import { PageHeader, MacroLine, SourceChip, EmptyState } from "@/components/ui";

export default function LedgerPage() {
  const [logs, setLogs] = useState<FoodLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [today, setToday] = useState(todayStr);
  const [date, setDate] = useState(todayStr);

  // Home links here with ?date=YYYY-MM-DD
  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get("date");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setDate(d);
  }, []);

  // Roll over to the new day if the app was left open overnight
  useEffect(() => {
    const checkDate = () => {
      const current = todayStr();
      setToday((prev) => {
        if (current !== prev) setDate((d) => (d === prev ? current : d));
        return current;
      });
    };
    document.addEventListener("visibilitychange", checkDate);
    return () => document.removeEventListener("visibilitychange", checkDate);
  }, []);

  const fetchLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch(`/api/logs?date=${date}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
    } catch {
      console.error("Failed to fetch logs");
    } finally {
      setIsLoadingLogs(false);
    }
  }, [date]);

  useEffect(() => {
    setExpandedId(null);
    fetchLogs();
  }, [fetchLogs]);

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch("/api/logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: "Entry deleted", type: "success" });
        fetchLogs();
      } else {
        setToast({ message: data.error || "Failed to delete", type: "error" });
      }
    } catch {
      setToast({ message: "Failed to delete", type: "error" });
    }
    setExpandedId(null);
  };

  const totals = sumLogs(logs);
  const tomorrow = shiftDate(today, 1);
  const dayLabel =
    date === today ? "Today" : date === tomorrow ? "Tomorrow" : date === shiftDate(today, -1) ? "Yesterday" : null;

  return (
    <>
      <PageHeader
        eyebrow={dayLabel ? `${dayLabel} · ${formatDate(date)}` : formatDate(date, { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
        title="Ledger"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDate((d) => shiftDate(d, -1))}
              className="btn btn-secondary btn-sm btn-icon"
              aria-label="Previous day"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setDate(today)}
              disabled={date === today}
              className="btn btn-secondary btn-sm"
            >
              Today
            </button>
            <button
              onClick={() => setDate((d) => shiftDate(d, 1))}
              disabled={date >= tomorrow}
              className="btn btn-secondary btn-sm btn-icon"
              aria-label="Next day"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        }
      />

      {/* Day totals */}
      <section className="card grid grid-cols-2 sm:grid-cols-4 mb-5 overflow-hidden" aria-label="Day totals">
        {[
          { label: "Calories", value: totals.calories.toLocaleString(), unit: "kcal", color: "var(--brand)" },
          { label: "Protein", value: totals.protein.toFixed(0), unit: "g", color: "var(--protein)" },
          { label: "Carbs", value: totals.carbs.toFixed(0), unit: "g", color: "var(--carbs)" },
          { label: "Fat", value: totals.fat.toFixed(0), unit: "g", color: "var(--fat)" },
        ].map(({ label, value, unit, color }, i) => (
          <div
            key={label}
            className={`px-4 sm:px-5 py-4 border-line ${i % 2 === 1 ? "border-l" : ""} ${
              i >= 2 ? "border-t sm:border-t-0" : ""
            } ${i === 2 ? "sm:border-l" : ""}`}
          >
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-2">
              <span className="w-2 h-2 rounded-full" style={{ background: color }} aria-hidden="true" />
              {label}
            </p>
            <p className="num mt-1.5 text-2xl font-semibold text-ink">
              {isLoadingLogs ? "–" : value}
              <span className="text-sm font-medium text-ink-3"> {unit}</span>
            </p>
          </div>
        ))}
      </section>

      {/* Entries */}
      {isLoadingLogs ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-16" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          title={date === today ? "Nothing logged today" : "Nothing logged for this day"}
          hint={date >= today ? "Log a meal from the Today screen." : undefined}
        />
      ) : (
        <>
          <p className="eyebrow mb-2 px-1">
            {logs.length} {logs.length === 1 ? "entry" : "entries"}
          </p>
          <ul className="card divide-y divide-line overflow-hidden">
            {logs.map((log) => {
              const open = expandedId === log.id;
              return (
                <li key={log.id}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setExpandedId(open ? null : log.id)}
                    className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-surface-2 transition-colors"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-ink truncate">{log.food_name}</span>
                      <span className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <MacroLine protein={log.protein} carbs={log.carbs} fat={log.fat} />
                        <SourceChip via={log.logged_via} />
                      </span>
                    </span>
                    <span className="num text-sm font-semibold text-ink flex-shrink-0">
                      {log.calories.toLocaleString()}
                      <span className="text-xs font-medium text-ink-3"> kcal</span>
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-ink-3 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>

                  {open && (
                    <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pb-3.5 fade">
                      <p className="num text-xs text-ink-3 min-w-0">
                        Logged at{" "}
                        {new Date(log.created_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <button onClick={() => handleDelete(log.id)} className="btn btn-danger btn-sm">
                        <Trash2 size={14} />
                        Delete entry
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
