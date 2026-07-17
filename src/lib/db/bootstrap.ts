import { neon } from "@neondatabase/serverless";
import { fileURLToPath } from "node:url";
import { initialSchemaSql } from "@/lib/db/schema";

export const BOOTSTRAP_SCHEMA_TABLES = [
  "party_settings",
  "guests",
  "invitations",
  "rsvps",
  "admin_sessions",
] as const;

type BootstrapOptions = {
  databaseUrl?: string;
};

export async function bootstrapPersistence(options: BootstrapOptions = {}) {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to bootstrap persistence");
  }

  const sql = neon(databaseUrl);
  await sql`${sql.unsafe(initialSchemaSql)}`;

  return { appliedTables: BOOTSTRAP_SCHEMA_TABLES };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await bootstrapPersistence();
  console.log(
    `Bootstrapped Party persistence tables: ${BOOTSTRAP_SCHEMA_TABLES.join(", ")}`,
  );
}
