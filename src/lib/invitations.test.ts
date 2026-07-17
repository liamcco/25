import { describe, expect, test } from "vitest";
import { hashSecret, type SqlExecutor } from "@/lib/admin";
import {
  createGuestNameSlug,
  createGuestWithInvitation,
  getGuestAccessByToken,
  listGuests,
  regenerateGuestInvitation,
  revokeGuestInvitation,
  updateGuestDisplayName,
  updateGuestInvitationSent,
} from "@/lib/invitations";

function createSqlStub(results: unknown[][] = []) {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const sql: SqlExecutor = async (strings, ...values) => {
    calls.push({ text: strings.join("?"), values });
    return results.shift() ?? [];
  };

  return { calls, sql };
}

describe("Guest Invitation URLs", () => {
  test("creates readable slugs from display names", () => {
    expect(createGuestNameSlug("  Åsa & Liam 25!  ")).toBe("asa-liam-25");
    expect(createGuestNameSlug("!!!")).toBe("guest");
  });

  test("creates a Guest with one active reusable Invitation URL", async () => {
    const { calls, sql } = createSqlStub([
      [],
      [
        {
          id: "guest-id",
          display_name: "Ada Lovelace",
          guest_name_slug: "ada-lovelace",
          invitation_sent: false,
          token: "token-value",
          is_active: true,
        },
      ],
    ]);

    const guest = await createGuestWithInvitation(sql, {
      displayName: " Ada   Lovelace ",
      origin: "https://example.com",
    });

    expect(guest).toEqual({
      id: "guest-id",
      displayName: "Ada Lovelace",
      guestNameSlug: "ada-lovelace",
      invitationSent: false,
      invitationUrl: "https://example.com/i/ada-lovelace/token-value",
    });
    expect(calls[1]?.text).toContain("INSERT INTO guests");
    expect(calls[1]?.text).toContain("INSERT INTO invitations");
    expect(calls[1]?.values[2]).toHaveLength(32);
    expect(calls[1]?.values[3]).toBe(hashSecret(calls[1]?.values[2] as string));
  });

  test("suffixes slugs when another Guest already uses the display name slug", async () => {
    const { sql } = createSqlStub([
      [{ id: "existing-guest" }],
      [],
      [
        {
          id: "guest-id",
          display_name: "Ada Lovelace",
          guest_name_slug: "ada-lovelace-2",
          invitation_sent: false,
          token: "token-value",
        },
      ],
    ]);

    await expect(
      createGuestWithInvitation(sql, {
        displayName: "Ada Lovelace",
        origin: "https://example.com",
      }),
    ).resolves.toMatchObject({
      guestNameSlug: "ada-lovelace-2",
      invitationUrl: "https://example.com/i/ada-lovelace-2/token-value",
    });
  });

  test("updates a Guest display name and canonical Invitation URL", async () => {
    const { calls, sql } = createSqlStub([
      [],
      [
        {
          id: "guest-id",
          display_name: "Grace Hopper",
          guest_name_slug: "grace-hopper",
          invitation_sent: false,
        },
      ],
      [{ token: "token-value" }],
    ]);

    await expect(
      updateGuestDisplayName(sql, {
        guestId: "guest-id",
        displayName: "Grace Hopper",
        origin: "https://example.com",
      }),
    ).resolves.toMatchObject({
      displayName: "Grace Hopper",
      invitationUrl: "https://example.com/i/grace-hopper/token-value",
    });
    expect(calls[1]?.text).toContain("UPDATE guests");
    expect(calls[1]?.values).toEqual([
      "Grace Hopper",
      "grace-hopper",
      "guest-id",
    ]);
  });

  test("marks whether an invitation has been sent to a Guest", async () => {
    const { calls, sql } = createSqlStub([[{ id: "guest-id" }]]);

    await updateGuestInvitationSent(sql, {
      guestId: "guest-id",
      invitationSent: true,
    });

    expect(calls[0]?.text).toContain("UPDATE guests");
    expect(calls[0]?.text).toContain("invitation_sent");
    expect(calls[0]?.values).toEqual([true, "guest-id"]);
  });

  test("resolves active access by authoritative token", async () => {
    const { calls, sql } = createSqlStub([
      [
        {
          guest_id: "guest-id",
          display_name: "Ada Lovelace",
          guest_name_slug: "ada-lovelace",
          token: "token-value",
          is_active: true,
        },
      ],
    ]);

    await expect(
      getGuestAccessByToken(sql, {
        token: "token-value",
        origin: "https://example.com",
      }),
    ).resolves.toEqual({
      status: "active",
      guest: {
        id: "guest-id",
        displayName: "Ada Lovelace",
        guestNameSlug: "ada-lovelace",
      },
      invitationUrl: "https://example.com/i/ada-lovelace/token-value",
    });
    expect(calls[0]?.values).toEqual([hashSecret("token-value")]);
  });

  test("classifies inactive known tokens without revealing guest details", async () => {
    const { sql } = createSqlStub([[{ is_active: false }]]);

    await expect(
      getGuestAccessByToken(sql, {
        token: "revoked-token",
        origin: "https://example.com",
      }),
    ).resolves.toEqual({ status: "inactive" });
  });

  test("does not reveal details for an invalid token", async () => {
    const { sql } = createSqlStub([[]]);

    await expect(
      getGuestAccessByToken(sql, {
        token: "missing-token",
        origin: "https://example.com",
      }),
    ).resolves.toEqual({ status: "not_found" });
  });

  test("regenerates a Guest Invitation URL by rotating the active token", async () => {
    const { calls, sql } = createSqlStub([
      [
        {
          id: "guest-id",
          display_name: "Ada Lovelace",
          guest_name_slug: "ada-lovelace",
          invitation_sent: false,
          token: "new-token-value",
        },
      ],
    ]);

    await expect(
      regenerateGuestInvitation(sql, {
        guestId: "guest-id",
        origin: "https://example.com",
      }),
    ).resolves.toEqual({
      id: "guest-id",
      displayName: "Ada Lovelace",
      guestNameSlug: "ada-lovelace",
      invitationSent: false,
      invitationUrl: "https://example.com/i/ada-lovelace/new-token-value",
    });

    expect(calls[0]?.text).toContain("UPDATE invitations");
    expect(calls[0]?.text).toContain("token_hash");
    expect(calls[0]?.text).toContain("invitations.is_active = true");
    expect(calls[0]?.text).toContain("INSERT INTO invitations");
    expect(calls[0]?.text).toContain("NOT EXISTS");
    expect(calls[0]?.text).not.toContain("rsvps");
    expect(calls[0]?.values[0]).toHaveLength(32);
    expect(calls[0]?.values[1]).toBe(hashSecret(calls[0]?.values[0] as string));
    expect(calls[0]?.values[2]).toBe("guest-id");
    expect(calls[0]?.values[3]).toBe(calls[0]?.values[0]);
    expect(calls[0]?.values[4]).toBe(calls[0]?.values[1]);
    expect(calls[0]?.values[5]).toBe("guest-id");
  });

  test("revokes a Guest's active Invitation URL", async () => {
    const { calls, sql } = createSqlStub([[{ id: "guest-id" }]]);

    await revokeGuestInvitation(sql, "guest-id");

    expect(calls[0]?.text).toContain("UPDATE invitations");
    expect(calls[0]?.text).toContain("is_active = false");
    expect(calls[0]?.text).toContain("revoked_at = now()");
    expect(calls[0]?.values).toEqual(["guest-id"]);
  });

  test("lists active Guest Invitation URLs for admin", async () => {
    const { sql } = createSqlStub([
      [
        {
          id: "guest-id",
          display_name: "Ada Lovelace",
          guest_name_slug: "ada-lovelace",
          invitation_sent: true,
          token: "token-value",
        },
      ],
    ]);

    await expect(listGuests(sql, "https://example.com")).resolves.toEqual([
      {
        id: "guest-id",
        displayName: "Ada Lovelace",
        guestNameSlug: "ada-lovelace",
        invitationSent: true,
        invitationUrl: "https://example.com/i/ada-lovelace/token-value",
      },
    ]);
  });
});
