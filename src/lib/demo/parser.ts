import type { FoodDictionaryEntry } from "@/lib/types";

// A small rule-based stand-in for the LLM parser used in the full app.
// It turns "180g raw chicken thigh" or "2 eggs" into a structured entry,
// then looks the food up in the saved dictionary.

export interface ParsedFood {
  entry: FoodDictionaryEntry | null;
  food: string;
  quantity: number;
  unit: "g" | "item";
  state: "raw" | "cooked";
  /** Per-100g (or per-item) values when the food is not in the dictionary. */
  estimate?: { calories_per_100g: number; protein_per_100g: number; carbs_per_100g: number; fat_per_100g: number };
}

const COOKED_WORDS = ["cooked", "grilled", "boiled", "fried", "baked", "roasted", "steamed"];
const FILLER = new Set(["of", "a", "an", "the", "some", "and", "with", "my", "medium", "large", "small", "slice", "slices", "piece", "pieces", "scoop", "scoops", "raw", ...COOKED_WORDS]);

// Rough grams for one item, used when someone types grams for a per-item food.
const ITEM_WEIGHT_G: Record<string, number> = {
  "medium egg": 50,
  banana: 118,
  apple: 182,
  "bread slice": 30,
  "whey protein scoop": 30,
};

// Fallback guesses for common foods that are not in the dictionary (per 100 g).
const ESTIMATES: { keys: string[]; kcal: number; p: number; c: number; f: number; defaultG: number }[] = [
  { keys: ["pizza"], kcal: 266, p: 11, c: 33, f: 10, defaultG: 250 },
  { keys: ["burger", "hamburger"], kcal: 254, p: 13, c: 30, f: 9, defaultG: 220 },
  { keys: ["chocolate"], kcal: 546, p: 5, c: 61, f: 31, defaultG: 40 },
  { keys: ["ice cream"], kcal: 207, p: 3.5, c: 24, f: 11, defaultG: 100 },
  { keys: ["chips", "fries"], kcal: 312, p: 3.4, c: 41, f: 15, defaultG: 150 },
  { keys: ["cereal"], kcal: 379, p: 8, c: 84, f: 1.6, defaultG: 40 },
  { keys: ["hummus"], kcal: 166, p: 8, c: 14, f: 10, defaultG: 50 },
  { keys: ["orange"], kcal: 47, p: 0.9, c: 12, f: 0.1, defaultG: 130 },
  { keys: ["yoghurt", "yogurt"], kcal: 63, p: 5, c: 7, f: 1.6, defaultG: 150 },
  { keys: ["steak"], kcal: 271, p: 25, c: 0, f: 19, defaultG: 200 },
  { keys: ["shrimp", "prawn"], kcal: 99, p: 24, c: 0.2, f: 0.3, defaultG: 120 },
  { keys: ["quinoa"], kcal: 120, p: 4.4, c: 21, f: 1.9, defaultG: 180 },
];

function singular(word: string) {
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
}

function tokens(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(singular);
}

export class UnknownFoodError extends Error {}

export function parseFoodText(text: string, dictionary: FoodDictionaryEntry[]): ParsedFood {
  const lower = text.toLowerCase().trim();

  const state: "raw" | "cooked" = /\braw\b/.test(lower) ? "raw" : "cooked";
  const stateGiven = /\braw\b/.test(lower) || COOKED_WORDS.some((w) => lower.includes(w));

  // Quantity: "180g", "0.5 kg", "2 eggs", "a banana"
  let grams: number | null = null;
  let count: number | null = null;
  let rest = lower;

  const g = rest.match(/(\d+(?:\.\d+)?)\s*(kg|g|gr|grams?)\b/);
  if (g) {
    grams = Number(g[1]) * (g[2] === "kg" ? 1000 : 1);
    rest = rest.replace(g[0], " ");
  } else {
    const n = rest.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*x?(?=\s|$)/);
    if (n) {
      count = Number(n[1]);
      rest = rest.replace(n[0], " ");
    } else if (/^(a|an|one)\s/.test(rest)) {
      count = 1;
    }
  }

  const queryTokens = tokens(rest).filter((t) => !FILLER.has(t));
  const queryAll = new Set(tokens(rest));
  if (queryTokens.length === 0) throw new UnknownFoodError("Describe a food, for example “180g raw chicken thigh”.");

  // Score dictionary entries. A match needs the typed words to be contained in the saved
  // name ("chicken thigh" finds "boneless chicken thigh") or the other way round.
  let best: { entry: FoodDictionaryEntry; score: number } | null = null;
  for (const entry of dictionary) {
    const nameTokens = tokens(entry.food_name).filter((t) => !FILLER.has(t));
    if (nameTokens.length === 0) continue;
    const nameSet = new Set(nameTokens);
    const entryInQuery = nameTokens.every((t) => queryAll.has(t));
    const queryInEntry = queryTokens.every((t) => nameSet.has(t));
    if (!entryInQuery && !queryInEntry) continue;
    const overlap = queryTokens.filter((t) => nameSet.has(t)).length;
    const extra = nameTokens.length - overlap; // saved-name words the user did not type
    let score = overlap * 10 - extra * 2;
    if (entry.state === state) score += stateGiven ? 5 : 2;
    if (!stateGiven && entry.state === "cooked") score += 1;
    if (!best || score > best.score) best = { entry, score };
  }

  if (best) {
    const entry = best.entry;
    const isItem = entry.unit_type === "item";
    let quantity: number;
    if (isItem) {
      quantity = count ?? (grams !== null ? Math.max(1, Math.round((grams / (ITEM_WEIGHT_G[entry.food_name] ?? 100)) * 10) / 10) : 1);
    } else {
      quantity = grams ?? (count !== null ? count * 100 : 100);
    }
    return { entry, food: entry.food_name, quantity, unit: isItem ? "item" : "g", state: entry.state as "raw" | "cooked" };
  }

  const guess = ESTIMATES.find((e) => e.keys.some((k) => lower.includes(k)));
  if (guess) {
    const quantity = grams ?? (count !== null ? count * guess.defaultG : guess.defaultG);
    return {
      entry: null,
      food: guess.keys[0],
      quantity,
      unit: "g",
      state,
      estimate: {
        calories_per_100g: guess.kcal,
        protein_per_100g: guess.p,
        carbs_per_100g: guess.c,
        fat_per_100g: guess.f,
      },
    };
  }

  throw new UnknownFoodError(
    "The demo parser doesn't know that food. Try a saved one like “chicken breast”, or add it under Settings → Dictionary."
  );
}
