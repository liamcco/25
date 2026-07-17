import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
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
  sql?: (statement: string) => Promise<unknown>;
};

let runtimeBootstrapPromise: Promise<unknown> | undefined;

export async function ensurePersistenceBootstrapped() {
  runtimeBootstrapPromise ??= bootstrapPersistence();

  return runtimeBootstrapPromise;
}

export async function bootstrapPersistence(options: BootstrapOptions = {}) {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;

  if (!databaseUrl && !options.sql) {
    throw new Error("DATABASE_URL is required to bootstrap persistence");
  }

  const execute = options.sql ?? createNeonStatementExecutor(databaseUrl);

  for (const statement of splitSqlStatements(initialSchemaSql)) {
    await execute(statement);
  }

  return { appliedTables: BOOTSTRAP_SCHEMA_TABLES };
}

function createNeonStatementExecutor(databaseUrl: string | undefined) {
  const sql = neon(databaseUrl as string);

  return async (statement: string) => {
    await sql`${sql.unsafe(statement)}`;
  };
}

export function splitSqlStatements(sql: string) {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await bootstrapPersistence();
  console.log(
    `Bootstrapped Party persistence tables: ${BOOTSTRAP_SCHEMA_TABLES.join(", ")}`,
  );
}
