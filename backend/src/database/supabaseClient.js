// backend/src/database/supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 🧠 Always load .env from project root
const envPath = resolve(__dirname, "../../../.env");
dotenv.config({ path: envPath });

if (!process.env.SUPABASE_URL) {
  console.error(`❌ Could not load SUPABASE_URL from ${envPath}`);
  console.error("Available env vars:", Object.keys(process.env));
  process.exit(1);
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
