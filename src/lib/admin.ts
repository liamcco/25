import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import type { LateResponsePolicy } from "@/lib/rsvp-policy";

export const ADMIN_SESSION_COOKIE = "party_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type SqlExecutor = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<unknown[]>;

export type PartySettings = {
  title: string;
  startsAt: Date;
  location: string;
  dressCode: string;
  publicInfo: string;
  confirmedInfo: string;
  lateResponsePolicy: LateResponsePolicy;
};

export type PartySettingsInput = PartySettings;

type PartySettingsRow = {
  title: string;
  starts_at: Date | string;
  location: string;
  dress_code: string;
  public_info: string;
  confirmed_info: string;
  late_response_policy: LateResponsePolicy;
};

export function createSql(databaseUrl = process.env.DATABASE_URL): SqlExecutor {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return neon(databaseUrl) as SqlExecutor;
}

export function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function verifyAdminPassword(
  attemptedPassword: string,
  configuredPassword: string | undefined = process.env.ADMIN_PASSWORD,
) {
  if (!configuredPassword) {
    throw new Error("ADMIN_PASSWORD is required");
  }

  return timingSafeStringEqual(attemptedPassword, configuredPassword);
}

export async function createAdminSession(sql: SqlExecutor, now = new Date()) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(now.getTime() + ADMIN_SESSION_TTL_SECONDS * 1000);

  await sql`
    INSERT INTO admin_sessions (session_token_hash, expires_at)
    VALUES (${hashSecret(token)}, ${expiresAt})
  `;

  return { token, expiresAt };
}

export async function verifyAdminSession(
  sql: SqlExecutor,
  token: string | undefined,
  now = new Date(),
) {
  if (!token) {
    return false;
  }

  const rows = await sql`
    SELECT id
    FROM admin_sessions
    WHERE session_token_hash = ${hashSecret(token)}
      AND expires_at > ${now}
    LIMIT 1
  `;

  return rows.length > 0;
}

export async function getOrCreatePartySettings(sql: SqlExecutor) {
  const existingRows = await sql`
    SELECT title, starts_at, location, dress_code, public_info, confirmed_info, late_response_policy
    FROM party_settings
    WHERE id = true
    LIMIT 1
  `;
  const existing = existingRows[0] as PartySettingsRow | undefined;

  if (existing) {
    return mapPartySettingsRow(existing);
  }

  const rows = await sql`
    INSERT INTO party_settings (id, starts_at)
    VALUES (true, ${getDefaultPartyStartsAt()})
    RETURNING title, starts_at, location, dress_code, public_info, confirmed_info, late_response_policy
  `;

  return mapPartySettingsRow(rows[0] as PartySettingsRow);
}

export async function updatePartySettings(
  sql: SqlExecutor,
  input: PartySettingsInput,
) {
  await sql`
    UPDATE party_settings
    SET title = ${input.title},
        starts_at = ${input.startsAt},
        location = ${input.location},
        dress_code = ${input.dressCode},
        public_info = ${input.publicInfo},
        confirmed_info = ${input.confirmedInfo},
        late_response_policy = ${input.lateResponsePolicy},
        updated_at = now()
    WHERE id = true
  `;
}

export function mapPartySettingsRow(row: PartySettingsRow): PartySettings {
  return {
    title: row.title,
    startsAt: new Date(row.starts_at),
    location: row.location,
    dressCode: row.dress_code,
    publicInfo: row.public_info,
    confirmedInfo: row.confirmed_info,
    lateResponsePolicy: row.late_response_policy,
  };
}

function getDefaultPartyStartsAt() {
  return new Date("2026-08-15T16:00:00.000Z");
}

function timingSafeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
