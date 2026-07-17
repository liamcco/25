import { describe, expect, test } from "vitest";
import {
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSession,
  getOrCreatePartySettings,
  hashSecret,
  type PartySettingsInput,
  type SqlExecutor,
  updatePartySettings,
  verifyAdminPassword,
  verifyAdminSession,
} from "@/lib/admin";
import {
  formatStockholmDateTimeLocal,
  parseStockholmDateTimeLocal,
} from "@/lib/stockholm-datetime";

function createSqlStub(results: unknown[][] = []) {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const sql: SqlExecutor = async (strings, ...values) => {
    calls.push({ text: strings.join("?"), values });
    return results.shift() ?? [];
  };

  return { calls, sql };
}

describe("admin authentication", () => {
  test("verifies the configured admin password without accepting a wrong password", () => {
    expect(verifyAdminPassword("correct horse", "correct horse")).toBe(true);
    expect(verifyAdminPassword("wrong", "correct horse")).toBe(false);
  });

  test("creates and verifies hashed admin sessions", async () => {
    const now = new Date("2026-07-17T12:00:00.000Z");
    const { calls, sql } = createSqlStub([[], [{ id: "session-id" }]]);

    const session = await createAdminSession(sql, now);

    expect(session.token).toHaveLength(64);
    expect(session.expiresAt.toISOString()).toBe(
      new Date(now.getTime() + ADMIN_SESSION_TTL_SECONDS * 1000).toISOString(),
    );
    expect(calls[0]?.text).toContain("INSERT INTO admin_sessions");
    expect(calls[0]?.values[0]).toBe(hashSecret(session.token));
    expect(calls[0]?.values[1]).toEqual(session.expiresAt);

    await expect(verifyAdminSession(sql, session.token, now)).resolves.toBe(
      true,
    );
    expect(calls[1]?.text).toContain("FROM admin_sessions");
    expect(calls[1]?.values).toEqual([hashSecret(session.token), now]);
  });
});

describe("Party Settings persistence", () => {
  test("creates default settings when the single Party row is missing", async () => {
    const startsAt = new Date("2026-08-15T16:00:00.000Z");
    const row = {
      title: "",
      starts_at: startsAt,
      location: "",
      dress_code: "",
      public_info: "",
      confirmed_info: "",
      late_response_policy: "decline_late",
    };
    const { calls, sql } = createSqlStub([[], [row]]);

    await expect(getOrCreatePartySettings(sql)).resolves.toEqual({
      title: "",
      startsAt,
      location: "",
      dressCode: "",
      publicInfo: "",
      confirmedInfo: "",
      lateResponsePolicy: "decline_late",
    });

    expect(calls[0]?.text).toContain("SELECT");
    expect(calls[1]?.text).toContain("INSERT INTO party_settings");
  });

  test("updates structured Party Settings fields", async () => {
    const input: PartySettingsInput = {
      title: "Liam's 25th",
      startsAt: new Date("2026-08-15T16:00:00.000Z"),
      location: "Stockholm, details on arrival",
      dressCode: "Summer formal",
      publicInfo: "Come hungry.",
      confirmedInfo: "Door code 2525.",
      lateResponsePolicy: "accept_late",
    };
    const { calls, sql } = createSqlStub([[]]);

    await updatePartySettings(sql, input);

    expect(calls[0]?.text).toContain("UPDATE party_settings");
    expect(calls[0]?.values).toEqual([
      input.title,
      input.startsAt,
      input.location,
      input.dressCode,
      input.publicInfo,
      input.confirmedInfo,
      input.lateResponsePolicy,
    ]);
  });
});

describe("Stockholm date/time fields", () => {
  test("round trips a party start through the datetime-local format", () => {
    const startsAt = new Date("2026-08-15T16:00:00.000Z");

    expect(formatStockholmDateTimeLocal(startsAt)).toBe("2026-08-15T18:00");
    expect(parseStockholmDateTimeLocal("2026-08-15T18:00")).toEqual(startsAt);
  });
});
