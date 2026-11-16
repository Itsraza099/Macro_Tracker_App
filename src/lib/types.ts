// Shared data shapes. These mirror the tables in the production schema
// (see docs/production-schema.sql).

export interface FoodDictionaryEntry {
  id: number;
  created_at: string;
  food_name: string;
  state: string;
  /** 'g' = values are per 100g. 'item' = values are per single item. */
  unit_type: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}

export interface FoodLogEntry {
  id: number;
  created_at: string;
  date: string;
  food_name: string;
  weight_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged_via: string;
}

export interface UserSettings {
  id: number;
  maintenance_calories: number;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
}

export interface WatchActivity {
  id: number;
  date: string;
  total_expenditure: number;
  updated_at: string;
}

/** A log the user has not confirmed yet. */
export interface PendingLog {
  food_name: string;
  date: string;
  weight_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged_via: string;
}
