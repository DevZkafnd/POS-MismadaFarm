import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";

// Load .env.local manually
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL tidak diatur");

  console.log("Menjalankan mismada_farm_schema.sql...");
  
  const sql = postgres(url, { max: 1 });
  const schema = readFileSync(join(process.cwd(), "mismada_farm_schema.sql"), "utf-8");
  
  try {
    await sql.unsafe(schema);
    console.log("✓ Skema berhasil dibuat");
  } catch (err) {
    console.error("Gagal:", err);
    throw err;
  } finally {
    await sql.end();
  }
}

main();
