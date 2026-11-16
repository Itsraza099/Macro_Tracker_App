"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { FoodLogEntry, UserSettings } from "@/lib/types";
import { formatDate } from "@/lib/dates";
import { PageHeader, MacroLine, EmptyState } from "@/components/ui";

// ---- Helper functions ----
// Format a local Date as YYYY-MM-DD. toISOString() would shift the day in
// timezones ahead of UTC (e.g. during summer time).
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
// Rolling window: the seven days ending on the given date.
function getWeekRange(date: Date) {
  const end = new Date(date);
  const start = new Date(date);
  start.setDate(end.getDate() - 6);
  return { from: ymd(start), to: ymd(end) };
}

function getMonthRange(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  return {
    from: ymd(first),
    to: ymd(last),
    daysInMonth: last.getDate(),
  };
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function TrendsPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateLogs, setSelectedDateLogs] = useState<FoodLogEntry[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ date: string; day: string; calories: number; protein: number }[]>([]);
  const [monthlyCalories, setMonthlyCalories] = useState(0);
  const [watchByDate, setWatchByDate] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState<UserSettings>({
    id: 1,
    maintenance_calories: 2500,
    target_calories: 2000,
    target_protein: 180,
    target_carbs: 250,
    target_fat: 70,
  });
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [datesWithData, setDatesWithData] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<"week" | "month">("week");

  const today = new Date().toISOString().split("T")[0];

  // Fetch settings
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setSettings(d.settings);
      })
      .catch(console.error);
  }, []);

  // Fetch weekly data
  const fetchWeeklyData = useCallback(async () => {
    setIsLoading(true);
    const { from, to } = getWeekRange(calendarDate);
    try {
      const res = await fetch(`/api/logs?from=${from}&to=${to}`);
      const data = await res.json();
      if (data.logs) {
        // Group by date
        const grouped: Record<string, { calories: number; protein: number }> = {};

        // Initialize all 7 days
        const startDate = new Date(from + "T00:00:00");
        for (let i = 0; i < 7; i++) {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + i);
          const key = ymd(d);
          grouped[key] = { calories: 0, protein: 0 };
        }

        data.logs.forEach((log: FoodLogEntry) => {
          if (!grouped[log.date]) grouped[log.date] = { calories: 0, protein: 0 };
          grouped[log.date].calories += log.calories;
          grouped[log.date].protein += Number(log.protein);
        });

        const chartData = Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, values]) => ({
            date,
            day: formatDateShort(date),
            ...values,
          }));

        setWeeklyData(chartData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [calendarDate]);

  // Fetch monthly data for deficit calculation
  const fetchMonthlyData = useCallback(async () => {
    const { from, to } = getMonthRange(calendarDate);
    try {
      const [logsRes, watchRes] = await Promise.all([
        fetch(`/api/logs?from=${from}&to=${to}`),
        fetch(`/api/sync-watch?from=${from}&to=${to}`),
      ]);
      const logsData = await logsRes.json();
      const watchData = await watchRes.json();

      if (logsData.logs) {
        const total = logsData.logs.reduce((sum: number, log: FoodLogEntry) => sum + log.calories, 0);
        setMonthlyCalories(total);
        const dates = new Set<string>();
        logsData.logs.forEach((log: FoodLogEntry) => dates.add(log.date));
        setDatesWithData(dates);
      }

      if (watchData.activities) {
        const byDate: Record<string, number> = {};
        watchData.activities.forEach((a: { date: string; total_expenditure: number }) => {
          byDate[a.date] = a.total_expenditure;
        });
        setWatchByDate(byDate);
      }
    } catch (e) {
      console.error(e);
    }
  }, [calendarDate]);

  useEffect(() => {
    fetchWeeklyData();
    fetchMonthlyData();
  }, [fetchWeeklyData, fetchMonthlyData]);

  // Fetch logs for a selected date
  const fetchDateLogs = async (date: string) => {
    try {
      const res = await fetch(`/api/logs?date=${date}`);
      const data = await res.json();
      if (data.logs) setSelectedDateLogs(data.logs);
    } catch {
      setSelectedDateLogs([]);
    }
  };

  // Calendar navigation
  const navigateMonth = (direction: number) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCalendarDate(newDate);
  };

  // Monthly deficit calculation — uses watch total_expenditure when available
  const { daysInMonth } = getMonthRange(calendarDate);
  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const daysPassed = calendarDate.getMonth() === new Date().getMonth() &&
    calendarDate.getFullYear() === new Date().getFullYear()
    ? new Date().getDate()
    : daysInMonth;

  let expectedCalories = 0;
  for (let i = 1; i <= daysPassed; i++) {
    const d = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    expectedCalories += watchByDate[d] ?? settings.maintenance_calories;
  }
  const cumulativeDeficit = expectedCalories - monthlyCalories;

  // Calendar grid
  const calendarDays = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // Monday start

  // Selected date totals
  const selectedDateTotals = useMemo(() =>
    selectedDateLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.calories,
        protein: acc.protein + Number(log.protein),
        carbs: acc.carbs + Number(log.carbs),
        fat: acc.fat + Number(log.fat),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    ),
    [selectedDateLogs]
  );

  const weekTitle =
    weeklyData.length > 0
      ? `${formatDate(weeklyData[0].date, { month: "short", day: "numeric" })} – ${formatDate(
          weeklyData[weeklyData.length - 1].date,
          { month: "short", day: "numeric" }
        )}`
      : "This week";
  const weekTotal = weeklyData.reduce((s, d) => s + d.calories, 0);
  const daysLogged = weeklyData.filter((d) => d.calories > 0).length;
  const weekAverage = daysLogged > 0 ? Math.round(weekTotal / daysLogged) : 0;
  const isDeficit = cumulativeDeficit > 0;

  const ChartTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: { date: string; calories: number; protein: number } }>;
  }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="card shadow-pop px-3 py-2">
        <p className="text-xs text-ink-3">{formatDate(d.date, { weekday: "short", month: "short", day: "numeric" })}</p>
        <p className="num text-sm font-semibold text-ink mt-0.5">{d.calories.toLocaleString()} kcal</p>
        <p className="num text-xs text-ink-2">{d.protein.toFixed(0)} g protein</p>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Intake over time"
        title="Trends"
        action={
          <div className="segmented" role="group" aria-label="Report range">
            <button type="button" aria-pressed={view === "week"} onClick={() => setView("week")}>
              Weekly
            </button>
            <button type="button" aria-pressed={view === "month"} onClick={() => setView("month")}>
              Monthly
            </button>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* ── Report: weekly chart or monthly balance ── */}
        <div className="min-w-0 lg:order-2">
          {view === "week" ? (
            <section className="card p-5 sm:p-6" aria-label="Weekly calorie intake">
              <p className="eyebrow">{weekTitle}</p>
              <div className="flex items-baseline gap-2 mt-2 mb-5">
                <p className="display num text-5xl text-ink">
                  {isLoading || daysLogged === 0 ? "–" : weekAverage.toLocaleString()}
                </p>
                <p className="text-sm text-ink-3">
                  {!isLoading && daysLogged === 0 ? "No entries this week" : "kcal a day, on days logged"}
                </p>
              </div>

              {isLoading ? (
                <div className="skeleton h-[220px]" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={weeklyData} barCategoryGap="24%" margin={{ top: 16, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--ink-3)", fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--ink-3)", fontSize: 12 }}
                      width={44}
                      tickFormatter={(v: number) => v.toLocaleString()}
                      domain={[
                        0,
                        (dataMax: number) =>
                          Math.ceil((Math.max(dataMax, settings.maintenance_calories) * 1.12) / 500) * 500,
                      ]}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-2)" }} />
                    <Bar dataKey="calories" radius={[4, 4, 0, 0]} fill="var(--brand)" maxBarSize={28} />
                    <ReferenceLine
                      y={settings.maintenance_calories}
                      stroke="var(--ink-3)"
                      strokeDasharray="2 4"
                      strokeWidth={1.5}
                      label={{
                        value: "Maintenance",
                        position: "insideTopRight",
                        fill: "var(--ink-2)",
                        fontSize: 11,
                      }}
                    />
                    <ReferenceLine
                      y={settings.target_calories}
                      stroke="var(--ink)"
                      strokeDasharray="6 4"
                      strokeWidth={1.5}
                      label={{
                        value: "Target",
                        position: "insideTopRight",
                        fill: "var(--ink)",
                        fontSize: 11,
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </section>
          ) : (
            <section className="card p-5 sm:p-6" aria-label="Monthly balance">
              <p className="eyebrow">
                {calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
              <div className="mt-2 mb-5">
                <p className={`display num text-5xl ${isDeficit ? "text-brand" : "text-danger"}`}>
                  {Math.abs(cumulativeDeficit).toLocaleString()}
                </p>
                <p className="text-sm text-ink-2 mt-2">
                  kcal cumulative {isDeficit ? "deficit" : "surplus"}
                  {isDeficit && (
                    <span className="text-ink-3">
                      {" "}
                      · about {(cumulativeDeficit / 7700).toFixed(1)} kg of fat
                    </span>
                  )}
                </p>
              </div>

              <dl className="border-t border-line divide-y divide-line">
                <div className="flex items-baseline justify-between gap-3 py-3">
                  <dt className="text-sm text-ink-2">Eaten</dt>
                  <dd className="num text-sm font-semibold text-ink">
                    {monthlyCalories.toLocaleString()} kcal
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 pt-3">
                  <dt className="text-sm text-ink-2">
                    Maintenance × {daysPassed} {daysPassed === 1 ? "day" : "days"}
                  </dt>
                  <dd className="num text-sm font-semibold text-ink">
                    {expectedCalories.toLocaleString()} kcal
                  </dd>
                </div>
              </dl>
            </section>
          )}
        </div>

        {/* ── Calendar + selected day ── */}
        <div className="space-y-5 min-w-0 lg:order-1">
          <section className="card p-4 sm:p-6" aria-label="Calendar">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigateMonth(-1)}
                className="btn btn-ghost btn-sm btn-icon"
                aria-label="Previous month"
              >
                <ChevronLeft size={18} />
              </button>
              <h2 className="text-base font-semibold text-ink">
                {calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h2>
              <button
                onClick={() => navigateMonth(1)}
                className="btn btn-ghost btn-sm btn-icon"
                aria-label="Next month"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                <div key={i} className="text-center text-xs font-semibold text-ink-3 py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: adjustedFirstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {Array.from({ length: calendarDays }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                const hasData = datesWithData.has(dateStr);
                const isFuture = dateStr > today;

                return (
                  <button
                    key={day}
                    onClick={() => {
                      if (!isFuture) {
                        setSelectedDate(dateStr);
                        fetchDateLogs(dateStr);
                      }
                    }}
                    disabled={isFuture}
                    aria-pressed={isSelected}
                    aria-label={`${formatDate(dateStr)}${hasData ? ", has entries" : ""}`}
                    className={`num relative h-11 rounded-xl text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-brand text-brand-ink"
                        : isToday
                          ? "bg-brand-soft text-brand font-semibold"
                          : isFuture
                            ? "text-ink-3 opacity-40"
                            : "text-ink hover:bg-surface-2"
                    }`}
                  >
                    {day}
                    {hasData && (
                      <span
                        className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                          isSelected ? "bg-brand-ink" : "bg-brand"
                        }`}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-ink-3 mt-4">
              <span className="w-1 h-1 rounded-full bg-brand" aria-hidden="true" />
              Days with entries. Tap a day for its breakdown.
            </p>
          </section>

          {selectedDate && (
            <section className="card p-5 sm:p-6 rise" aria-label="Selected day">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-base font-semibold text-ink">{formatDate(selectedDate)}</h2>
                <button
                  onClick={() => {
                    setSelectedDate(null);
                    setSelectedDateLogs([]);
                  }}
                  className="btn btn-ghost btn-sm btn-icon -mr-2"
                  aria-label="Close day"
                >
                  <X size={18} />
                </button>
              </div>

              {selectedDateLogs.length === 0 ? (
                <EmptyState title="No entries for this day" />
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { label: "Calories", value: selectedDateTotals.calories.toLocaleString(), color: "var(--brand)" },
                      { label: "Protein", value: `${selectedDateTotals.protein.toFixed(0)} g`, color: "var(--protein)" },
                      { label: "Carbs", value: `${selectedDateTotals.carbs.toFixed(0)} g`, color: "var(--carbs)" },
                      { label: "Fat", value: `${selectedDateTotals.fat.toFixed(0)} g`, color: "var(--fat)" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="min-w-0">
                        <p className="flex items-center gap-1.5 text-xs text-ink-3">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} aria-hidden="true" />
                          <span className="truncate">{label}</span>
                        </p>
                        <p className="num text-lg font-semibold text-ink mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>

                  <ul className="border-t border-line divide-y divide-line max-h-64 overflow-y-auto">
                    {selectedDateLogs.map((log) => (
                      <li key={log.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm text-ink truncate">{log.food_name}</p>
                          <div className="mt-0.5">
                            <MacroLine protein={log.protein} carbs={log.carbs} fat={log.fat} />
                          </div>
                        </div>
                        <p className="num text-sm font-semibold text-ink flex-shrink-0">
                          {log.calories.toLocaleString()}
                          <span className="text-xs font-medium text-ink-3"> kcal</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
