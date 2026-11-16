// Dates are stored and compared as UTC "YYYY-MM-DD" strings throughout the app.

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

export function formatDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = { weekday: "long", month: "short", day: "numeric" }
): string {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}

export function sumLogs(
  logs: { calories: number; protein: number; carbs: number; fat: number }[]
) {
  return logs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + Number(log.protein),
      carbs: acc.carbs + Number(log.carbs),
      fat: acc.fat + Number(log.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
