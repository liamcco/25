import { describe, expect, test } from "vitest";
import type { SqlExecutor } from "@/lib/admin";
import {
  getGuestResponseSummary,
  getGuestRsvp,
  listConfirmedAttendees,
  listGuestsWithResponses,
  saveGuestRsvp,
} from "@/lib/rsvps";

function createSqlStub(results: unknown[][] = []) {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const sql: SqlExecutor = async (strings, ...values) => {
    calls.push({ text: strings.join("?"), values });
    return results.shift() ?? [];
  };

  return { calls, sql };
}

describe("RSVP persistence", () => {
  test("starts a new Guest as Not responded", async () => {
    const { sql } = createSqlStub([[]]);

    await expect(getGuestRsvp(sql, "guest-id")).resolves.toEqual({
      status: "not_responded",
    });
  });

  test("saves a Yes RSVP with an optional admin-only note", async () => {
    const { calls, sql } = createSqlStub([[]]);

    await expect(
      saveGuestRsvp(sql, {
        guestId: "guest-id",
        answer: "yes",
        note: "  Can't wait.  ",
        now: new Date("2026-08-14T21:58:00.000Z"),
      }),
    ).resolves.toEqual({ status: "yes", isLate: false });

    expect(calls[0]?.text).toContain("INSERT INTO rsvps");
    expect(calls[0]?.values).toEqual([
      "guest-id",
      "yes",
      false,
      "Can't wait.",
      new Date("2026-08-14T21:58:00.000Z"),
      new Date("2026-08-14T21:58:00.000Z"),
    ]);
  });

  test("lists admin-visible statuses and summary counts", async () => {
    const { sql } = createSqlStub([
      [
        {
          id: "guest-1",
          display_name: "Ada Lovelace",
          guest_name_slug: "ada-lovelace",
          token: "token-1",
          rsvp_status: "yes",
          rsvp_is_late: false,
          rsvp_note: "Bringing flowers.",
        },
        {
          id: "guest-2",
          display_name: "Grace Hopper",
          guest_name_slug: "grace-hopper",
          token: "token-2",
          rsvp_status: null,
          rsvp_is_late: null,
          rsvp_note: null,
        },
      ],
      [
        {
          total_guests: "4",
          not_responded: "1",
          yes: "1",
          yes_late: "1",
          no: "1",
        },
      ],
    ]);

    await expect(
      listGuestsWithResponses(sql, "https://example.com"),
    ).resolves.toEqual([
      {
        id: "guest-1",
        displayName: "Ada Lovelace",
        guestNameSlug: "ada-lovelace",
        invitationUrl: "https://example.com/i/ada-lovelace/token-1",
        rsvp: { status: "yes", isLate: false },
        rsvpNote: "Bringing flowers.",
      },
      {
        id: "guest-2",
        displayName: "Grace Hopper",
        guestNameSlug: "grace-hopper",
        invitationUrl: "https://example.com/i/grace-hopper/token-2",
        rsvp: { status: "not_responded" },
        rsvpNote: "",
      },
    ]);

    await expect(getGuestResponseSummary(sql)).resolves.toEqual({
      totalGuests: 4,
      notResponded: 1,
      yes: 1,
      yesLate: 1,
      no: 1,
    });
  });

  test("lists names only for current Yes RSVPs in display-name order", async () => {
    const { calls, sql } = createSqlStub([
      [
        { display_name: "Ada Lovelace" },
        { display_name: "Grace Hopper" },
        { display_name: "Katherine Johnson" },
      ],
    ]);

    await expect(listConfirmedAttendees(sql)).resolves.toEqual([
      { displayName: "Ada Lovelace" },
      { displayName: "Grace Hopper" },
      { displayName: "Katherine Johnson" },
    ]);

    expect(calls[0]?.text).toContain("WHERE rsvps.status = 'yes'");
    expect(calls[0]?.text).toContain("ORDER BY lower(guests.display_name)");
    expect(calls[0]?.text).not.toContain("note");
  });
});
