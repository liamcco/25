"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSql } from "@/lib/admin";
import { ensurePersistenceBootstrapped } from "@/lib/db/bootstrap";
import { getGuestAccessByToken } from "@/lib/invitations";
import { getRequestOrigin } from "@/lib/request-origin";
import type { RsvpAnswer } from "@/lib/rsvp-policy";
import { saveGuestRsvp } from "@/lib/rsvps";

export async function submitRsvp(token: string, formData: FormData) {
  await ensurePersistenceBootstrapped();

  const answer = parseRsvpAnswer(formData.get("answer"));
  const note = getOptionalString(formData, "note");
  const sql = createSql();
  const access = await getGuestAccessByToken(sql, {
    token,
    origin: await getRequestOrigin(),
  });

  if (access.status === "not_found") {
    redirect(`/i/invalid/${token}`);
  }

  await saveGuestRsvp(sql, {
    guestId: access.guest.id,
    answer,
    note,
  });

  revalidatePath(access.invitationUrl);
  redirect(`${access.invitationUrl}?rsvpSaved=1`);
}

function parseRsvpAnswer(value: FormDataEntryValue | null): RsvpAnswer {
  if (value === "yes" || value === "no") {
    return value;
  }

  throw new Error("RSVP answer is required");
}

function getOptionalString(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}
