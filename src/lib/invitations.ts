import { randomBytes } from "node:crypto";
import { hashSecret, type SqlExecutor } from "@/lib/admin";

export type Guest = {
  id: string;
  displayName: string;
  guestNameSlug: string;
  invitationUrl: string;
};

export type GuestAccess =
  | {
      status: "active";
      guest: {
        id: string;
        displayName: string;
        guestNameSlug: string;
      };
      invitationUrl: string;
    }
  | { status: "inactive" }
  | { status: "not_found" };

type GuestRow = {
  id: string;
  display_name: string;
  guest_name_slug: string;
  token: string;
};

type GuestAccessRow = {
  guest_id: string;
  display_name: string;
  guest_name_slug: string;
  token: string;
  is_active: boolean;
};

export function createGuestNameSlug(displayName: string) {
  const slug = displayName
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "guest";
}

export function createInvitationToken() {
  return randomBytes(24).toString("base64url");
}

export function createInvitationUrl(
  origin: string,
  slug: string,
  token: string,
) {
  return `${origin.replace(/\/$/, "")}/i/${slug}/${token}`;
}

export async function listGuests(sql: SqlExecutor, origin: string) {
  const rows = (await sql`
    SELECT guests.id, guests.display_name, guests.guest_name_slug, invitations.token
    FROM guests
    JOIN invitations ON invitations.guest_id = guests.id
    WHERE invitations.is_active = true
    ORDER BY lower(guests.display_name), guests.created_at
  `) as GuestRow[];

  return rows.map((row) => mapGuestRow(row, origin));
}

export async function createGuestWithInvitation(
  sql: SqlExecutor,
  input: { displayName: string; origin: string },
) {
  const displayName = normalizeDisplayName(input.displayName);
  const guestNameSlug = await createUniqueGuestSlug(
    sql,
    createGuestNameSlug(displayName),
  );
  const token = createInvitationToken();

  const rows = (await sql`
    WITH new_guest AS (
      INSERT INTO guests (display_name, guest_name_slug)
      VALUES (${displayName}, ${guestNameSlug})
      RETURNING id, display_name, guest_name_slug
    ),
    new_invitation AS (
      INSERT INTO invitations (guest_id, token, token_hash, is_active)
      SELECT id, ${token}, ${hashSecret(token)}, true
      FROM new_guest
      RETURNING guest_id, token
    )
    SELECT new_guest.id, new_guest.display_name, new_guest.guest_name_slug, new_invitation.token
    FROM new_guest
    JOIN new_invitation ON new_invitation.guest_id = new_guest.id
  `) as GuestRow[];

  return mapGuestRow(rows[0] as GuestRow, input.origin);
}

export async function updateGuestDisplayName(
  sql: SqlExecutor,
  input: { guestId: string; displayName: string; origin: string },
) {
  const displayName = normalizeDisplayName(input.displayName);
  const guestNameSlug = await createUniqueGuestSlug(
    sql,
    createGuestNameSlug(displayName),
    input.guestId,
  );

  const rows = (await sql`
    UPDATE guests
    SET display_name = ${displayName},
        guest_name_slug = ${guestNameSlug},
        updated_at = now()
    WHERE id = ${input.guestId}
    RETURNING id, display_name, guest_name_slug
  `) as Array<Omit<GuestRow, "token">>;

  if (!rows[0]) {
    throw new Error("Guest not found");
  }

  const invitationRows = (await sql`
    SELECT token
    FROM invitations
    WHERE guest_id = ${input.guestId}
      AND is_active = true
    LIMIT 1
  `) as Array<Pick<GuestRow, "token">>;

  if (!invitationRows[0]) {
    throw new Error("Active invitation not found");
  }

  return mapGuestRow(
    { ...rows[0], token: invitationRows[0].token },
    input.origin,
  );
}

export async function regenerateGuestInvitation(
  sql: SqlExecutor,
  input: { guestId: string; origin: string },
) {
  const token = createInvitationToken();
  const rows = (await sql`
    WITH updated_invitation AS (
      UPDATE invitations
      SET token = ${token},
          token_hash = ${hashSecret(token)},
          is_active = true,
          revoked_at = NULL,
          updated_at = now()
      FROM guests
      WHERE invitations.guest_id = guests.id
        AND invitations.guest_id = ${input.guestId}
        AND invitations.is_active = true
      RETURNING guests.id, guests.display_name, guests.guest_name_slug, invitations.token
    ),
    inserted_invitation AS (
      INSERT INTO invitations (guest_id, token, token_hash, is_active)
      SELECT guests.id, ${token}, ${hashSecret(token)}, true
      FROM guests
      WHERE guests.id = ${input.guestId}
        AND NOT EXISTS (SELECT 1 FROM updated_invitation)
      RETURNING guest_id, token
    )
    SELECT id, display_name, guest_name_slug, token
    FROM updated_invitation
    UNION ALL
    SELECT guests.id, guests.display_name, guests.guest_name_slug, inserted_invitation.token
    FROM guests
    JOIN inserted_invitation ON inserted_invitation.guest_id = guests.id
  `) as GuestRow[];

  if (!rows[0]) {
    throw new Error("Guest not found");
  }

  return mapGuestRow(rows[0], input.origin);
}

export async function revokeGuestInvitation(sql: SqlExecutor, guestId: string) {
  const rows = (await sql`
    UPDATE invitations
    SET is_active = false,
        revoked_at = now(),
        updated_at = now()
    WHERE guest_id = ${guestId}
      AND is_active = true
    RETURNING guest_id AS id
  `) as Array<{ id: string }>;

  if (!rows[0]) {
    throw new Error("Active invitation not found");
  }
}

export async function getGuestAccessByToken(
  sql: SqlExecutor,
  input: { token: string; origin: string },
): Promise<GuestAccess> {
  const rows = (await sql`
    SELECT guests.id AS guest_id,
           guests.display_name,
           guests.guest_name_slug,
           invitations.token,
           invitations.is_active
    FROM invitations
    JOIN guests ON guests.id = invitations.guest_id
    WHERE invitations.token_hash = ${hashSecret(input.token)}
    LIMIT 1
  `) as GuestAccessRow[];
  const row = rows[0];

  if (!row) {
    return { status: "not_found" };
  }

  if (!row.is_active) {
    return { status: "inactive" };
  }

  return {
    status: "active",
    guest: {
      id: row.guest_id,
      displayName: row.display_name,
      guestNameSlug: row.guest_name_slug,
    },
    invitationUrl: createInvitationUrl(
      input.origin,
      row.guest_name_slug,
      row.token,
    ),
  };
}

async function createUniqueGuestSlug(
  sql: SqlExecutor,
  baseSlug: string,
  currentGuestId?: string,
) {
  for (let index = 0; index < 100; index += 1) {
    const candidate = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`;
    const rows = (await sql`
      SELECT id
      FROM guests
      WHERE guest_name_slug = ${candidate}
        AND (${currentGuestId ?? null}::uuid IS NULL OR id <> ${currentGuestId ?? null}::uuid)
      LIMIT 1
    `) as Array<{ id: string }>;

    if (rows.length === 0) {
      return candidate;
    }
  }

  throw new Error("Unable to create a unique guest slug");
}

function normalizeDisplayName(displayName: string) {
  const normalized = displayName.trim().replace(/\s+/g, " ");

  if (!normalized) {
    throw new Error("Guest display name is required");
  }

  return normalized;
}

function mapGuestRow(row: GuestRow, origin: string): Guest {
  return {
    id: row.id,
    displayName: row.display_name,
    guestNameSlug: row.guest_name_slug,
    invitationUrl: createInvitationUrl(origin, row.guest_name_slug, row.token),
  };
}
