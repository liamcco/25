import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createRsvpYesUrl } from "@/app/i/[slug]/[token]/invitation-routes";
import {
  InvitationHeader,
  InvitationShell,
  PartyDetailsCard,
  RsvpFormCard,
} from "@/app/i/[slug]/[token]/invitation-ui";
import {
  RsvpFeedback,
  type RsvpFeedbackSearchParams,
} from "@/app/i/[slug]/[token]/rsvp-feedback";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createSql, getOrCreatePartySettings } from "@/lib/admin";
import { ensurePersistenceBootstrapped } from "@/lib/db/bootstrap";
import { getGuestAccessByToken } from "@/lib/invitations";
import { getRequestOrigin } from "@/lib/request-origin";
import { getGuestRsvp } from "@/lib/rsvps";

type InvitationPageProps = {
  params: Promise<{
    slug: string;
    token: string;
  }>;
  searchParams?: Promise<RsvpFeedbackSearchParams>;
};

export default async function InvitationPage({
  params,
  searchParams,
}: InvitationPageProps) {
  const { slug, token } = await params;
  const feedback = await searchParams;
  await ensurePersistenceBootstrapped();

  const sql = createSql();
  const access = await getGuestAccessByToken(sql, {
    token,
    origin: await getRequestOrigin(),
  });

  if (access.status === "not_found") {
    return (
      <UnavailableInvitation>
        <AlertTitle>Invitation unavailable</AlertTitle>
        <AlertDescription>
          This Invitation URL is invalid or no longer active.
        </AlertDescription>
      </UnavailableInvitation>
    );
  }

  if (access.status === "inactive") {
    return (
      <UnavailableInvitation>
        <AlertTitle>Invitation unavailable</AlertTitle>
        <AlertDescription>
          This Invitation URL is no longer active.
        </AlertDescription>
      </UnavailableInvitation>
    );
  }

  if (slug !== access.guest.guestNameSlug) {
    // Guest display names can change, so stale invitation slugs should not be cached permanently.
    redirect(access.invitationUrl);
  }

  const [settings, rsvp] = await Promise.all([
    getOrCreatePartySettings(sql),
    getGuestRsvp(sql, access.guest.id),
  ]);

  if (rsvp.status === "yes") {
    redirect(createRsvpYesUrl(access.invitationUrl));
  }

  const hasDeclined = rsvp.status === "no";

  return (
    <InvitationShell>
      <InvitationHeader
        guestName={access.guest.displayName}
        headline={
          hasDeclined
            ? "So sorry you can't make it"
            : settings.title || "You're invited"
        }
        intro={
          hasDeclined
            ? "We'll miss you. If plans change, you can still update your RSVP here."
            : "You are warmly invited to celebrate with us. I would genuinely love to have you there."
        }
        rsvp={rsvp}
        settings={settings}
      />

      <RsvpFeedback feedback={feedback} />
      <PartyDetailsCard settings={settings} />
      <RsvpFormCard currentRsvp={rsvp} token={token} />
    </InvitationShell>
  );
}

function UnavailableInvitation({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[linear-gradient(180deg,var(--background),var(--muted))] px-6 py-10 text-foreground">
      <Alert variant="destructive" className="max-w-md bg-card">
        {children}
        <AlertDescription className="mt-2">
          Ask the host for a current Invitation URL if you expected access.
        </AlertDescription>
      </Alert>
    </main>
  );
}
