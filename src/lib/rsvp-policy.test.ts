import { describe, expect, test } from "vitest";
import {
  calculateRsvpChangeCutoff,
  evaluateRsvpChange,
  LATE_RESPONSE_ACCEPTED_MESSAGE,
  LATE_RESPONSE_DECLINED_MESSAGE,
} from "@/lib/rsvp-policy";

const partyStartsAt = new Date("2026-08-15T18:00:00+02:00");

describe("RSVP Change Cutoff", () => {
  test("is 23:59 Europe/Stockholm time on the day before the Party", () => {
    expect(calculateRsvpChangeCutoff(partyStartsAt).toISOString()).toBe(
      "2026-08-14T21:59:00.000Z",
    );
  });

  test("uses the Europe/Stockholm winter offset for winter parties", () => {
    expect(
      calculateRsvpChangeCutoff(
        new Date("2026-01-15T18:00:00+01:00"),
      ).toISOString(),
    ).toBe("2026-01-14T22:59:00.000Z");
  });

  test("allows RSVP changes before cutoff without late metadata", () => {
    expect(
      evaluateRsvpChange({
        current: { status: "not_responded" },
        requestedAnswer: "yes",
        now: new Date("2026-08-14T21:58:59.000Z"),
        partyStartsAt,
        lateResponsePolicy: "decline_late",
      }),
    ).toEqual({
      allowed: true,
      next: { status: "yes", isLate: false },
    });
  });

  test("treats the exact cutoff minute as still before cutoff", () => {
    expect(
      evaluateRsvpChange({
        current: { status: "not_responded" },
        requestedAnswer: "yes",
        now: new Date("2026-08-14T21:59:00.000Z"),
        partyStartsAt,
        lateResponsePolicy: "decline_late",
      }),
    ).toEqual({
      allowed: true,
      next: { status: "yes", isLate: false },
    });
  });

  test("applies the Late Response Policy immediately after cutoff", () => {
    expect(
      evaluateRsvpChange({
        current: { status: "not_responded" },
        requestedAnswer: "yes",
        now: new Date("2026-08-14T21:59:00.001Z"),
        partyStartsAt,
        lateResponsePolicy: "decline_late",
      }),
    ).toEqual({
      allowed: false,
      message: LATE_RESPONSE_DECLINED_MESSAGE,
    });
  });

  test("allows post-cutoff Yes to No cancellations", () => {
    expect(
      evaluateRsvpChange({
        current: { status: "yes", isLate: false },
        requestedAnswer: "no",
        now: new Date("2026-08-14T22:00:00.000Z"),
        partyStartsAt,
        lateResponsePolicy: "decline_late",
      }),
    ).toEqual({
      allowed: true,
      next: { status: "no" },
    });
  });

  test("records accepted post-cutoff Yes responses as Yes late", () => {
    expect(
      evaluateRsvpChange({
        current: { status: "no" },
        requestedAnswer: "yes",
        now: new Date("2026-08-14T22:00:00.000Z"),
        partyStartsAt,
        lateResponsePolicy: "accept_late",
      }),
    ).toEqual({
      allowed: true,
      message: LATE_RESPONSE_ACCEPTED_MESSAGE,
      next: { status: "yes", isLate: true },
    });
  });

  test("declines post-cutoff attempts to become Yes when late responses are closed", () => {
    expect(
      evaluateRsvpChange({
        current: { status: "not_responded" },
        requestedAnswer: "yes",
        now: new Date("2026-08-14T22:00:00.000Z"),
        partyStartsAt,
        lateResponsePolicy: "decline_late",
      }),
    ).toEqual({
      allowed: false,
      message: LATE_RESPONSE_DECLINED_MESSAGE,
    });
  });
});
