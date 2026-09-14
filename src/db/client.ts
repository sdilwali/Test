import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/* ══════════════════════════════════════════════════════════════════════════
   Database client.

   Two connection strings, deliberately:

   - DATABASE_URL is Supabase's transaction-mode pooler (port 6543). It is
     what serverless request handlers use, because each invocation gets a
     short-lived connection and the pooler keeps Postgres from drowning in
     them. Prepared statements must be off — transaction mode cannot support
     them.
   - DIRECT_URL is the direct connection (port 5432), used only by migrations.
     The pooler cannot run DDL reliably in transaction mode.
   ══════════════════════════════════════════════════════════════════════════ */

function connectionString(): string {
  const url = process.env["DATABASE_URL"];
  if (url === undefined || url === "") {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill in " +
        "the Supabase transaction-mode pooler string (port 6543).",
    );
  }
  return url;
}

/* Next dev reloads modules on every edit; without memoising, each reload
   opens another pool and Postgres runs out of connections in about a minute. */
const globalForDb = globalThis as unknown as {
  __dibsSql?: ReturnType<typeof postgres>;
};

function sql() {
  if (globalForDb.__dibsSql === undefined) {
    globalForDb.__dibsSql = postgres(connectionString(), {
      prepare: false, // required by the transaction-mode pooler
      max: 10,
      idle_timeout: 20,
    });
  }
  return globalForDb.__dibsSql;
}

export function getDb() {
  return drizzle(sql(), { schema });
}

export type Db = ReturnType<typeof getDb>;
export { schema };
