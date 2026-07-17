import { describe, expect, test } from "vitest";
import type { SqlExecutor } from "@/lib/admin";
import {
  LATE_RESPONSE_ACCEPTED_MESSAGE,
  LATE_RESPONSE_DECLINED_MESSAGE,
} from "@/lib/rsvp-policy";
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
    const { calls, sql } = createSqlStub([[], []]);

    await expect(
      saveGuestRsvp(sql, {
        guestId: "guest-id",
        answer: "yes",
        note: "  Can't wait.  ",
        now: new Date("2026-08-14T21:58:00.000Z"),
        partyStartsAt: new Date("2026-08-15T16:00:00.000Z"),
        lateResponsePolicy: "decline_late",
      }),
    ).resolves.toEqual({
      allowed: true,
      rsvp: { status: "yes", isLate: false },
      message: undefined,
    });

    expect(calls[1]?.text).toContain("INSERT INTO rsvps");
    expect(calls[1]?.values).toEqual([
      "guest-id",
      "yes",
      false,
      "Can't wait.",
      new Date("2026-08-14T21:58:00.000Z"),
      new Date("2026-08-14T21:58:00.000Z"),
    ]);
  });

  test("saves an accepted post-cutoff Yes RSVP as Yes late", async () => {
    const { calls, sql } = createSqlStub([[], []]);

    await expect(
      saveGuestRsvp(sql, {
        guestId: "guest-id",
        answer: "yes",
        note: "I can still make it.",
        now: new Date("2026-08-14T22:00:00.000Z"),
        partyStartsAt: new Date("2026-08-15T16:00:00.000Z"),
        lateResponsePolicy: "accept_late",
      }),
    ).resolves.toEqual({
      allowed: true,
      rsvp: { status: "yes", isLate: true },
      message: LATE_RESPONSE_ACCEPTED_MESSAGE,
    });

    expect(calls[1]?.text).toContain("INSERT INTO rsvps");
    expect(calls[1]?.values).toEqual([
      "guest-id",
      "yes",
      true,
      "I can still make it.",
      new Date("2026-08-14T22:00:00.000Z"),
      new Date("2026-08-14T22:00:00.000Z"),
    ]);
  });

  test("saves an accepted post-cutoff No-to-Yes RSVP as Yes late", async () => {
    const { calls, sql } = createSqlStub([
      [{ status: "no", is_late: false }],
      [],
    ]);

    await expect(
      saveGuestRsvp(sql, {
        guestId: "guest-id",
        answer: "yes",
        note: "Plans changed again.",
        now: new Date("2026-08-14T22:00:00.000Z"),
        partyStartsAt: new Date("2026-08-15T16:00:00.000Z"),
        lateResponsePolicy: "accept_late",
      }),
    ).resolves.toEqual({
      allowed: true,
      rsvp: { status: "yes", isLate: true },
      message: LATE_RESPONSE_ACCEPTED_MESSAGE,
    });

    expect(calls[1]?.text).toContain("INSERT INTO rsvps");
    expect(calls[1]?.values).toEqual([
      "guest-id",
      "yes",
      true,
      "Plans changed again.",
      new Date("2026-08-14T22:00:00.000Z"),
      new Date("2026-08-14T22:00:00.000Z"),
    ]);
  });

  test("declines post-cutoff Yes attempts without saving an RSVP note", async () => {
    const { calls, sql } = createSqlStub([[]]);

    await expect(
      saveGuestRsvp(sql, {
        guestId: "guest-id",
        answer: "yes",
        note: "Please save this late note.",
        now: new Date("2026-08-14T22:00:00.000Z"),
        partyStartsAt: new Date("2026-08-15T16:00:00.000Z"),
        lateResponsePolicy: "decline_late",
      }),
    ).resolves.toEqual({
      allowed: false,
      message: LATE_RESPONSE_DECLINED_MESSAGE,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.text).toContain("SELECT status, is_late");
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
        {
          id: "guest-3",
          display_name: "Katherine Johnson",
          guest_name_slug: "katherine-johnson",
          token: null,
          rsvp_status: "no",
          rsvp_is_late: false,
          rsvp_note: "Revoked but still visible.",
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
      {
        id: "guest-3",
        displayName: "Katherine Johnson",
        guestNameSlug: "katherine-johnson",
        invitationUrl: null,
        rsvp: { status: "no" },
        rsvpNote: "Revoked but still visible.",
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
