-- Data model of the full version of the app (PostgreSQL / Supabase).
-- The demo in this repository keeps the same shapes in the browser instead.

CREATE TABLE food_dictionary (            -- verified nutrition data, one row per food and state
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  food_name TEXT NOT NULL,
  state TEXT NOT NULL,                    -- 'raw' | 'cooked'
  unit_type TEXT NOT NULL DEFAULT 'g',    -- 'g' = values per 100 g, 'item' = values per single item
  calories_per_100g INT NOT NULL,
  protein_per_100g NUMERIC(5,2) NOT NULL,
  carbs_per_100g NUMERIC(5,2) NOT NULL,
  fat_per_100g NUMERIC(5,2) NOT NULL,
  UNIQUE (food_name, state)
);

CREATE TABLE food_logs (                  -- every confirmed entry
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE DEFAULT CURRENT_DATE,
  food_name TEXT NOT NULL,
  weight_g NUMERIC NOT NULL,
  calories INT NOT NULL,
  protein NUMERIC(6,2) NOT NULL,
  carbs NUMERIC(6,2) NOT NULL,
  fat NUMERIC(6,2) NOT NULL,
  logged_via TEXT NOT NULL                -- dictionary | text_api | vision_label | barcode
);
CREATE INDEX idx_food_logs_date ON food_logs(date);

CREATE TABLE user_settings (              -- single-row config
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  maintenance_calories INT NOT NULL,
  target_calories INT NOT NULL DEFAULT 2000,
  target_protein INT NOT NULL,
  target_carbs INT NOT NULL DEFAULT 250,
  target_fat INT NOT NULL DEFAULT 70
);

CREATE TABLE watch_activity (             -- daily energy expenditure synced from a wearable
  id BIGSERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  total_expenditure INT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
