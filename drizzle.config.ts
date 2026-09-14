import type { Config } from "drizzle-kit";

/* Migrations run against the DIRECT connection (port 5432). Supabase's
   transaction-mode pooler cannot reliably run DDL. */
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"] ?? "",
  },
  strict: true,
  verbose: true,
} satisfies Config;
