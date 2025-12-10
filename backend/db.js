import 'dotenv/config'
import pkg from "pg"
const { Pool } = pkg

const DBURI = process.env.DATABASE_URL

export const db = new Pool({
  connectionString: DBURI,
  ssl: { rejectUnauthorized: false },
  host: "db.hnxszuekbzvrzxyqtmln.supabase.co",
  port: 5432
})

db.connect()
  .then(() => console.log("Connected to PostgreSQL successfully!"))
  .catch(err => console.error("DB connection error:", err.message))
