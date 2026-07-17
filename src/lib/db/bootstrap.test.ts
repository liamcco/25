import { describe, expect, test } from "vitest";
import {
  BOOTSTRAP_SCHEMA_TABLES,
  bootstrapPersistence,
} from "@/lib/db/bootstrap";
import { initialSchemaSql } from "@/lib/db/schema";

describe("persistence bootstrap", () => {
  const databaseTest =
    process.env.RUN_DATABASE_TESTS === "1" && process.env.DATABASE_URL
      ? test
      : test.skip;

  test("defines the core Party state tables", () => {
    expect(BOOTSTRAP_SCHEMA_TABLES).toEqual([
      "party_settings",
      "guests",
      "invitations",
      "rsvps",
      "admin_sessions",
    ]);

    for (const table of BOOTSTRAP_SCHEMA_TABLES) {
      expect(initialSchemaSql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
    expect(initialSchemaSql).toContain("invitation_sent boolean");
    expect(initialSchemaSql).toContain(
      "ADD COLUMN IF NOT EXISTS invitation_sent",
    );
  });

  test("splits the schema into single statements for Neon prepared execution", async () => {
    const executedStatements: string[] = [];

    await bootstrapPersistence({
      sql: async (statement) => {
        executedStatements.push(statement);
      },
    });

    expect(executedStatements.length).toBeGreaterThan(1);

    for (const statement of executedStatements) {
      expect(statement.trim()).not.toBe("");
      expect(statement.trim().slice(0, -1)).not.toContain(";");
    }
  });

  databaseTest("applies the initial schema to Postgres", async () => {
    await expect(bootstrapPersistence()).resolves.toEqual({
      appliedTables: BOOTSTRAP_SCHEMA_TABLES,
    });
  });
});
