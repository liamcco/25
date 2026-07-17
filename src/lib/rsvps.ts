import type { SqlExecutor } from "@/lib/admin";
import { createInvitationUrl } from "@/lib/invitations";
import type { RsvpAnswer, RsvpState } from "@/lib/rsvp-policy";

export type GuestWithResponse = {
  id: string;
  displayName: string;
  guestNameSlug: string;
  invitationUrl: string;
  rsvp: RsvpState;
  rsvpNote: string;
};

export type GuestResponseSummary = {
  totalGuests: number;
  notResponded: number;
  yes: number;
  yesLate: number;
  no: number;
};

type RsvpRow = {
  status: RsvpAnswer;
  is_late: boolean | null;
};

type GuestWithResponseRow = {
  id: string;
  display_name: string;
  guest_name_slug: string;
  token: string;
  rsvp_status: RsvpAnswer | null;
  rsvp_is_late: boolean | null;
  rsvp_note: string | null;
};

type SummaryRow = {
  total_guests: number | string;
  not_responded: number | string;
  yes: number | string;
  yes_late: number | string;
  no: number | string;
};

export async function getGuestRsvp(
  sql: SqlExecutor,
  guestId: string,
): Promise<RsvpState> {
  const rows = (await sql`
    SELECT status, is_late
    FROM rsvps
    WHERE guest_id = ${guestId}
    LIMIT 1
  `) as RsvpRow[];

  return mapRsvpRow(rows[0]);
}

export async function saveGuestRsvp(
  sql: SqlExecutor,
  input: {
    guestId: string;
    answer: RsvpAnswer;
    note: string;
    now?: Date;
  },
): Promise<Exclude<RsvpState, { status: "not_responded" }>> {
  const now = input.now ?? new Date();
  const next = toBasicRsvpState(input.answer);

  await sql`
    INSERT INTO rsvps (guest_id, status, is_late, note, responded_at, updated_at)
    VALUES (
      ${input.guestId},
      ${next.status},
      ${next.status === "yes" ? next.isLate : false},
      ${normalizeNote(input.note)},
      ${now},
      ${now}
    )
    ON CONFLICT (guest_id) DO UPDATE
    SET status = EXCLUDED.status,
        is_late = EXCLUDED.is_late,
        note = EXCLUDED.note,
        updated_at = EXCLUDED.updated_at
  `;

  return next;
}

export async function listGuestsWithResponses(
  sql: SqlExecutor,
  origin: string,
): Promise<GuestWithResponse[]> {
  const rows = (await sql`
    SELECT guests.id,
           guests.display_name,
           guests.guest_name_slug,
           invitations.token,
           rsvps.status AS rsvp_status,
           rsvps.is_late AS rsvp_is_late,
           rsvps.note AS rsvp_note
    FROM guests
    JOIN invitations ON invitations.guest_id = guests.id
    LEFT JOIN rsvps ON rsvps.guest_id = guests.id
    WHERE invitations.is_active = true
    ORDER BY lower(guests.display_name), guests.created_at
  `) as GuestWithResponseRow[];

  return rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    guestNameSlug: row.guest_name_slug,
    invitationUrl: createInvitationUrl(origin, row.guest_name_slug, row.token),
    rsvp: mapRsvpRow(
      row.rsvp_status
        ? { status: row.rsvp_status, is_late: row.rsvp_is_late }
        : undefined,
    ),
    rsvpNote: row.rsvp_note ?? "",
  }));
}

export async function getGuestResponseSummary(
  sql: SqlExecutor,
): Promise<GuestResponseSummary> {
  const rows = (await sql`
    SELECT count(*) AS total_guests,
           count(*) FILTER (WHERE rsvps.guest_id IS NULL) AS not_responded,
           count(*) FILTER (WHERE rsvps.status = 'yes' AND rsvps.is_late = false) AS yes,
           count(*) FILTER (WHERE rsvps.status = 'yes' AND rsvps.is_late = true) AS yes_late,
           count(*) FILTER (WHERE rsvps.status = 'no') AS no
    FROM guests
    LEFT JOIN rsvps ON rsvps.guest_id = guests.id
  `) as SummaryRow[];
  const row = rows[0];

  return {
    totalGuests: toCount(row?.total_guests),
    notResponded: toCount(row?.not_responded),
    yes: toCount(row?.yes),
    yesLate: toCount(row?.yes_late),
    no: toCount(row?.no),
  };
}

function mapRsvpRow(row: RsvpRow | undefined): RsvpState {
  if (!row) {
    return { status: "not_responded" };
  }

  if (row.status === "yes") {
    return { status: "yes", isLate: row.is_late ?? false };
  }

  return { status: "no" };
}

function normalizeNote(note: string) {
  return note.trim();
}

function toBasicRsvpState(
  answer: RsvpAnswer,
): Exclude<RsvpState, { status: "not_responded" }> {
  if (answer === "yes") {
    return { status: "yes", isLate: false };
  }

  return { status: "no" };
}

function toCount(value: number | string | undefined) {
  return Number(value ?? 0);
}
