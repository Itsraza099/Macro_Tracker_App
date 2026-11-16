import type { FoodDictionaryEntry, FoodLogEntry, PendingLog, WatchActivity } from "@/lib/types";
import { todayStr } from "@/lib/dates";
import { loadDb, saveDb } from "./store";
import { parseFoodText, UnknownFoodError } from "./parser";

// An in-browser implementation of the app's /api/* routes. Responses use the
// same shapes as the real server routes, so the UI code is identical in both.

export interface ApiResult {
  status: number;
  body: unknown;
}

const ok = (body: unknown, status = 200): ApiResult => ({ status, body });
const fail = (error: string, status = 400): ApiResult => ({ status, body: { error } });
const round2 = (n: number) => Math.round(n * 100) / 100;

// Fixed values returned for any label photo: the demo can't read images.
const SAMPLE_LABEL = { calories_per_100g: 96, protein_per_100g: 9.5, carbs_per_100g: 4.2, fat_per_100g: 4.6 };

export async function handleApi(method: string, url: URL, body: unknown): Promise<ApiResult> {
  const path = url.pathname.replace(/\/$/, "");
  const q = url.searchParams;
  const db = loadDb();
  const json = (body ?? {}) as Record<string, unknown>;

  switch (path) {
    // ── Food logs ──────────────────────────────────────────────────────────
    case "/api/logs": {
      if (method === "GET") {
        const date = q.get("date");
        const from = q.get("from");
        const to = q.get("to");
        let logs: FoodLogEntry[];
        if (date) logs = db.logs.filter((l) => l.date === date);
        else if (from && to) logs = db.logs.filter((l) => l.date >= from && l.date <= to);
        else logs = db.logs.filter((l) => l.date === todayStr());
        logs = [...logs].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
        return ok({ logs });
      }
      if (method === "POST") {
        const p = json as unknown as PendingLog;
        if (!p.food_name || !p.date) return fail("Missing food_name or date");
        const log: FoodLogEntry = {
          id: db.nextId.logs++,
          created_at: new Date().toISOString(),
          date: p.date,
          food_name: String(p.food_name),
          weight_g: Number(p.weight_g) || 0,
          calories: Math.round(Number(p.calories) || 0),
          protein: Number(p.protein) || 0,
          carbs: Number(p.carbs) || 0,
          fat: Number(p.fat) || 0,
          logged_via: p.logged_via || "text_api",
        };
        db.logs.push(log);
        saveDb(db);
        return ok({ success: true, log });
      }
      if (method === "DELETE") {
        if (!json.id) return fail("Missing 'id'");
        db.logs = db.logs.filter((l) => l.id !== json.id);
        saveDb(db);
        return ok({ success: true });
      }
      if (method === "PATCH") {
        const { id, ...updates } = json;
        const log = db.logs.find((l) => l.id === id);
        if (!log) return fail("Entry not found", 404);
        Object.assign(log, updates);
        saveDb(db);
        return ok({ success: true, log });
      }
      break;
    }

    // ── Food dictionary ────────────────────────────────────────────────────
    case "/api/dictionary": {
      if (method === "GET") {
        const search = (q.get("search") || "").toLowerCase();
        const limit = Math.min(Number(q.get("limit") || "30"), 100);
        const entries = db.dictionary
          .filter((e) => !search || e.food_name.toLowerCase().includes(search))
          .sort((a, b) => a.food_name.localeCompare(b.food_name))
          .slice(0, limit);
        return ok({ entries });
      }
      if (method === "POST") {
        if (!json.food_name || !json.state) return fail("Missing food_name or state");
        const dup = db.dictionary.some((e) => e.food_name === json.food_name && e.state === json.state);
        if (dup) return fail("That food and state already exist", 409);
        const entry: FoodDictionaryEntry = {
          id: db.nextId.dictionary++,
          created_at: new Date().toISOString(),
          food_name: String(json.food_name),
          state: String(json.state),
          unit_type: "g",
          calories_per_100g: Math.round(Number(json.calories_per_100g) || 0),
          protein_per_100g: Number(json.protein_per_100g) || 0,
          carbs_per_100g: Number(json.carbs_per_100g) || 0,
          fat_per_100g: Number(json.fat_per_100g) || 0,
        };
        db.dictionary.push(entry);
        saveDb(db);
        return ok({ success: true, entry });
      }
      if (method === "PATCH") {
        const { id, ...updates } = json;
        const entry = db.dictionary.find((e) => e.id === id);
        if (!entry) return fail("Entry not found", 404);
        Object.assign(entry, updates);
        saveDb(db);
        return ok({ success: true, entry });
      }
      if (method === "DELETE") {
        if (!json.id) return fail("Missing id");
        db.dictionary = db.dictionary.filter((e) => e.id !== json.id);
        saveDb(db);
        return ok({ success: true });
      }
      break;
    }

    // ── Settings ───────────────────────────────────────────────────────────
    case "/api/settings": {
      if (method === "GET") return ok({ settings: db.settings });
      if (method === "PUT") {
        const s = json as Record<string, unknown>;
        db.settings = {
          id: 1,
          maintenance_calories: Number(s.maintenance_calories),
          target_calories: Number(s.target_calories),
          target_protein: Number(s.target_protein),
          target_carbs: Number(s.target_carbs),
          target_fat: Number(s.target_fat),
        };
        saveDb(db);
        return ok({ success: true, settings: db.settings });
      }
      break;
    }

    // ── Daily energy expenditure (e.g. synced from a watch) ────────────────
    case "/api/sync-watch": {
      if (method === "POST") {
        if (!json.date || typeof json.total_expenditure !== "number") {
          return fail("Required: date (YYYY-MM-DD) and total_expenditure (integer kcal)");
        }
        const existing = db.watch.find((w) => w.date === json.date);
        const now = new Date().toISOString();
        let activity: WatchActivity;
        if (existing) {
          existing.total_expenditure = json.total_expenditure;
          existing.updated_at = now;
          activity = existing;
        } else {
          activity = { id: db.nextId.watch++, date: String(json.date), total_expenditure: json.total_expenditure, updated_at: now };
          db.watch.push(activity);
        }
        saveDb(db);
        return ok({ success: true, activity });
      }
      if (method === "GET") {
        const date = q.get("date");
        const from = q.get("from");
        const to = q.get("to");
        if (date) return ok({ activities: db.watch.filter((w) => w.date === date) });
        if (from && to) return ok({ activities: db.watch.filter((w) => w.date >= from && w.date <= to) });
        return fail("Provide date or from+to params");
      }
      break;
    }

    // ── Text logging: parse, look up, scale. Returns a pending log. ────────
    case "/api/log-food": {
      if (method !== "POST") break;
      if (!json.text || typeof json.text !== "string") return fail("Missing or invalid 'text' field");
      try {
        const parsed = parseFoodText(json.text, db.dictionary);
        const base = parsed.entry ?? parsed.estimate!;
        const mult = parsed.unit === "item" ? parsed.quantity : parsed.quantity / 100;
        const label = parsed.unit === "item" ? `${parsed.quantity}× ${parsed.state} ${parsed.food}` : `${parsed.quantity}g ${parsed.state} ${parsed.food}`;
        const pending: PendingLog = {
          date: typeof json.date === "string" ? json.date : todayStr(),
          food_name: label,
          weight_g: parsed.quantity,
          calories: Math.round(base.calories_per_100g * mult),
          protein: round2(base.protein_per_100g * mult),
          carbs: round2(base.carbs_per_100g * mult),
          fat: round2(base.fat_per_100g * mult),
          logged_via: parsed.entry ? "dictionary" : "text_api",
        };
        return ok({ success: true, pending });
      } catch (e) {
        if (e instanceof UnknownFoodError) return fail(e.message, 422);
        throw e;
      }
    }

    // ── Label scan: the demo can't read photos, so it returns sample values ─
    case "/api/scan-label": {
      if (method !== "POST") break;
      const weight = Number(json.weight);
      if (!weight) return fail("Missing or invalid 'weight' (grams)");
      const m = weight / 100;
      const pending: PendingLog = {
        date: typeof json.date === "string" && json.date ? json.date : todayStr(),
        food_name: `${weight}g ${json.foodName || "Scanned food item"}`,
        weight_g: weight,
        calories: Math.round(SAMPLE_LABEL.calories_per_100g * m),
        protein: round2(SAMPLE_LABEL.protein_per_100g * m),
        carbs: round2(SAMPLE_LABEL.carbs_per_100g * m),
        fat: round2(SAMPLE_LABEL.fat_per_100g * m),
        logged_via: "vision_label",
      };
      return ok({ success: true, pending });
    }
  }

  return fail("Not found", 404);
}
