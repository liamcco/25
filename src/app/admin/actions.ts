"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSession,
  createSql,
  updatePartySettings,
  verifyAdminPassword,
} from "@/lib/admin";
import { getCurrentAdminSession } from "@/lib/admin-session";
import {
  createGuestWithInvitation,
  regenerateGuestInvitation,
  revokeGuestInvitation,
  updateGuestDisplayName,
} from "@/lib/invitations";
import { getRequestOrigin } from "@/lib/request-origin";
import type { LateResponsePolicy } from "@/lib/rsvp-policy";
import { parseStockholmDateTimeLocal } from "@/lib/stockholm-datetime";

export async function loginAdmin(formData: FormData) {
  const password = getRequiredString(formData, "password");

  if (!verifyAdminPassword(password)) {
    redirect("/admin/login?error=invalid");
  }

  const session = await createAdminSession(createSql());
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/admin",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
    expires: session.expiresAt,
  });

  redirect("/admin");
}

export async function savePartySettings(formData: FormData) {
  if (!(await getCurrentAdminSession())) {
    redirect("/admin/login");
  }

  await updatePartySettings(createSql(), {
    title: getRequiredString(formData, "title"),
    startsAt: parseStockholmDateTimeLocal(
      getRequiredString(formData, "startsAt"),
    ),
    location: getRequiredString(formData, "location"),
    dressCode: getRequiredString(formData, "dressCode"),
    publicInfo: getRequiredString(formData, "publicInfo"),
    confirmedInfo: getRequiredString(formData, "confirmedInfo"),
    lateResponsePolicy: parseLateResponsePolicy(
      getRequiredString(formData, "lateResponsePolicy"),
    ),
  });

  revalidatePath("/admin");
  redirect("/admin?saved=1");
}

export async function createGuest(formData: FormData) {
  if (!(await getCurrentAdminSession())) {
    redirect("/admin/login");
  }

  await createGuestWithInvitation(createSql(), {
    displayName: getRequiredString(formData, "displayName"),
    origin: await getRequestOrigin(),
  });

  revalidatePath("/admin");
  redirect("/admin?guestCreated=1");
}

export async function saveGuestDisplayName(formData: FormData) {
  if (!(await getCurrentAdminSession())) {
    redirect("/admin/login");
  }

  const guestId = getRequiredString(formData, "guestId");

  await updateGuestDisplayName(createSql(), {
    guestId,
    displayName: getRequiredString(formData, "displayName"),
    origin: await getRequestOrigin(),
  });

  revalidateAdminGuest(guestId);
  redirect(getAdminRedirectPath(formData, "/admin?guestSaved=1"));
}

export async function regenerateInvitation(formData: FormData) {
  if (!(await getCurrentAdminSession())) {
    redirect("/admin/login");
  }

  const guestId = getRequiredString(formData, "guestId");

  await regenerateGuestInvitation(createSql(), {
    guestId,
    origin: await getRequestOrigin(),
  });

  revalidateAdminGuest(guestId);
  redirect(getAdminRedirectPath(formData, "/admin?invitationRegenerated=1"));
}

export async function revokeInvitation(formData: FormData) {
  if (!(await getCurrentAdminSession())) {
    redirect("/admin/login");
  }

  const guestId = getRequiredString(formData, "guestId");

  await revokeGuestInvitation(createSql(), guestId);

  revalidateAdminGuest(guestId);
  redirect(getAdminRedirectPath(formData, "/admin?invitationRevoked=1"));
}

function getRequiredString(formData: FormData, name: string) {
  const value = formData.get(name);

  if (typeof value !== "string") {
    throw new Error(`${name} is required`);
  }

  return value.trim();
}

function parseLateResponsePolicy(value: string): LateResponsePolicy {
  if (value === "accept_late" || value === "decline_late") {
    return value;
  }

  throw new Error("Invalid Late Response Policy");
}

function getAdminRedirectPath(formData: FormData, fallback: string) {
  const value = formData.get("redirectTo");

  if (typeof value === "string" && value.startsWith("/admin")) {
    return value;
  }

  return fallback;
}

function revalidateAdminGuest(guestId: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/guests/${guestId}`);
}
