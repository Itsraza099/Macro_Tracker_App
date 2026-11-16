import type {
  FoodDictionaryEntry,
  FoodLogEntry,
  UserSettings,
  WatchActivity,
} from "@/lib/types";
import { shiftDate, todayStr } from "@/lib/dates";

export interface DemoDb {
  dictionary: FoodDictionaryEntry[];
  logs: FoodLogEntry[];
  settings: UserSettings;
  watch: WatchActivity[];
  nextId: { dictionary: number; logs: number; watch: number };
}

type Seed = [name: string, state: "raw" | "cooked", kcal: number, p: number, c: number, f: number, unit?: "item"];

// Typical USDA-style values. Per 100 g, or per single item when unit is "item".
const DICTIONARY_SEED: Seed[] = [
  ["chicken breast", "cooked", 165, 31, 0, 3.6],
  ["chicken breast", "raw", 120, 22.5, 0, 2.6],
  ["boneless chicken thigh", "cooked", 209, 26, 0, 10.9],
  ["boneless chicken thigh", "raw", 121, 19.7, 0, 4.1],
  ["lean beef mince", "cooked", 250, 26, 0, 15],
  ["lean beef mince", "raw", 176, 20, 0, 10],
  ["salmon fillet", "cooked", 206, 22, 0, 12],
  ["salmon fillet", "raw", 208, 20, 0, 13],
  ["tuna", "cooked", 116, 25.5, 0, 0.8],
  ["tofu", "raw", 76, 8, 1.9, 4.8],
  ["medium egg", "cooked", 72, 6.3, 0.4, 5, "item"],
  ["greek yogurt", "raw", 59, 10, 3.6, 0.4],
  ["whole milk", "raw", 61, 3.2, 4.8, 3.3],
  ["cheddar cheese", "raw", 403, 25, 1.3, 33],
  ["white rice", "cooked", 130, 2.7, 28, 0.3],
  ["brown rice", "cooked", 123, 2.7, 25.6, 1],
  ["pasta", "cooked", 158, 5.8, 31, 0.9],
  ["potato", "cooked", 87, 1.9, 20, 0.1],
  ["sweet potato", "cooked", 90, 2, 20.7, 0.2],
  ["lentils", "cooked", 116, 9, 20, 0.4],
  ["oats", "raw", 389, 16.9, 66, 6.9],
  ["bread slice", "cooked", 79, 2.7, 14.3, 1, "item"],
  ["broccoli", "cooked", 35, 2.4, 7.2, 0.4],
  ["banana", "raw", 105, 1.3, 27, 0.4, "item"],
  ["apple", "raw", 95, 0.5, 25, 0.3, "item"],
  ["avocado", "raw", 160, 2, 8.5, 14.7],
  ["olive oil", "raw", 884, 0, 0, 100],
  ["peanut butter", "raw", 588, 25, 20, 50],
  ["almonds", "raw", 579, 21, 22, 50],
  ["whey protein scoop", "raw", 120, 24, 3, 1.5, "item"],
];

export const DEFAULT_SETTINGS: UserSettings = {
  id: 1,
  maintenance_calories: 2500,
  target_calories: 2000,
  target_protein: 180,
  target_carbs: 220,
  target_fat: 65,
};

// Small deterministic PRNG so the sample history looks the same on every first run.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Meal templates: [food, state, amount]. Amount is grams, or an item count for "item" foods. */
type Meal = [string, "raw" | "cooked", number][];
const BREAKFASTS: Meal[] = [
  [["oats", "raw", 70], ["whole milk", "raw", 200], ["banana", "raw", 1]],
  [["medium egg", "cooked", 3], ["bread slice", "cooked", 2], ["avocado", "raw", 60]],
  [["greek yogurt", "raw", 250], ["almonds", "raw", 25], ["apple", "raw", 1]],
];
const LUNCHES: Meal[] = [
  [["chicken breast", "cooked", 200], ["white rice", "cooked", 220], ["broccoli", "cooked", 120]],
  [["boneless chicken thigh", "cooked", 180], ["sweet potato", "cooked", 250], ["broccoli", "cooked", 100]],
  [["tuna", "cooked", 150], ["pasta", "cooked", 200], ["olive oil", "raw", 10]],
];
const DINNERS: Meal[] = [
  [["salmon fillet", "cooked", 170], ["potato", "cooked", 250], ["broccoli", "cooked", 150]],
  [["lean beef mince", "cooked", 170], ["brown rice", "cooked", 200], ["lentils", "cooked", 100]],
  [["chicken breast", "cooked", 220], ["pasta", "cooked", 220], ["cheddar cheese", "raw", 25]],
];
const SNACKS: Meal[] = [
  [["whey protein scoop", "raw", 1], ["banana", "raw", 1]],
  [["peanut butter", "raw", 30], ["bread slice", "cooked", 1]],
];

function buildMeal(
  dictionary: FoodDictionaryEntry[],
  meal: Meal,
  date: string,
  hour: number,
  idStart: number
): FoodLogEntry[] {
  return meal.map(([name, state, amount], i) => {
    const entry = dictionary.find((d) => d.food_name === name && d.state === state)!;
    const isItem = entry.unit_type === "item";
    const mult = isItem ? amount : amount / 100;
    return {
      id: idStart + i,
      created_at: new Date(`${date}T${String(hour).padStart(2, "0")}:${String(10 + i * 3).padStart(2, "0")}:00Z`).toISOString(),
      date,
      food_name: isItem ? `${amount}× ${state} ${name}` : `${amount}g ${state} ${name}`,
      weight_g: amount,
      calories: Math.round(entry.calories_per_100g * mult),
      protein: round2(entry.protein_per_100g * mult),
      carbs: round2(entry.carbs_per_100g * mult),
      fat: round2(entry.fat_per_100g * mult),
      logged_via: i === 0 && name === "whey protein scoop" ? "barcode" : "dictionary",
    };
  });
}

export function createSeedDb(): DemoDb {
  const now = new Date().toISOString();
  const dictionary: FoodDictionaryEntry[] = DICTIONARY_SEED.map(
    ([food_name, state, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, unit], i) => ({
      id: i + 1,
      created_at: now,
      food_name,
      state,
      unit_type: unit ?? "g",
      calories_per_100g,
      protein_per_100g,
      carbs_per_100g,
      fat_per_100g,
    })
  );

  const rand = mulberry32(7);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const today = todayStr();
  const logs: FoodLogEntry[] = [];
  const watch: WatchActivity[] = [];
  let logId = 1;
  let watchId = 1;

  // Three weeks of history, with the odd untracked day.
  for (let back = 21; back >= 0; back--) {
    const date = shiftDate(today, -back);
    const isToday = back === 0;
    if (!isToday && rand() < 0.1) continue;

    const meals: Meal[] = [pick(BREAKFASTS), pick(LUNCHES)];
    // Today is only partly logged so the dashboard has room left to fill.
    if (!isToday) {
      meals.push(pick(DINNERS));
      if (rand() < 0.65) meals.push(pick(SNACKS));
    }
    const hours = [8, 13, 19, 16];
    meals.forEach((meal, mi) => {
      const entries = buildMeal(dictionary, meal, date, hours[mi], logId);
      logId += entries.length;
      logs.push(...entries);
    });

    if (!isToday) {
      watch.push({
        id: watchId++,
        date,
        total_expenditure: Math.round(2500 + (rand() - 0.4) * 500),
        updated_at: now,
      });
    }
  }

  return {
    dictionary,
    logs,
    settings: { ...DEFAULT_SETTINGS },
    watch,
    nextId: { dictionary: dictionary.length + 1, logs: logId, watch: watchId },
  };
}
