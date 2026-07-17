import { redirect } from "next/navigation";
import {
  ConfirmedInfoCard,
  InvitationHeader,
  InvitationShell,
  RsvpFormCard,
} from "@/app/i/[slug]/[token]/invitation-ui";
import {
  RsvpFeedback,
  type RsvpFeedbackSearchParams,
} from "@/app/i/[slug]/[token]/rsvp-feedback";
import { createSql, getOrCreatePartySettings } from "@/lib/admin";
import { ensurePersistenceBootstrapped } from "@/lib/db/bootstrap";
import { getGuestAccessByToken } from "@/lib/invitations";
import { getRequestOrigin } from "@/lib/request-origin";
import { getGuestRsvp, listConfirmedAttendees } from "@/lib/rsvps";

type RsvpYesPageProps = {
  params: Promise<{
    slug: string;
    token: string;
  }>;
  searchParams?: Promise<RsvpFeedbackSearchParams>;
};

export default async function RsvpYesPage({
  params,
  searchParams,
}: RsvpYesPageProps) {
  const { slug, token } = await params;
  const feedback = await searchParams;
  await ensurePersistenceBootstrapped();

  const sql = createSql();
  const access = await getGuestAccessByToken(sql, {
    token,
    origin: await getRequestOrigin(),
  });

  if (access.status !== "active") {
    redirect(`/i/${slug}/${token}`);
  }

  if (slug !== access.guest.guestNameSlug) {
    redirect(`${access.invitationUrl}/rsvp-yes`);
  }

  const [settings, rsvp] = await Promise.all([
    getOrCreatePartySettings(sql),
    getGuestRsvp(sql, access.guest.id),
  ]);

  if (rsvp.status !== "yes") {
    redirect(access.invitationUrl);
  }

  const attendeeList = await listConfirmedAttendees(sql);

  return (
    <InvitationShell>
      <InvitationHeader
        guestName={access.guest.displayName}
        headline="You're on the list"
        intro="I am so glad you can make it. Here are the confirmed details and everyone who has said yes so far."
        rsvp={rsvp}
        settings={settings}
      />

      <RsvpFeedback feedback={feedback} />
      <ConfirmedInfoCard
        attendees={attendeeList}
        confirmedInfo={settings.confirmedInfo}
      />
      <RsvpFormCard currentRsvp={rsvp} title="Change your RSVP" token={token} />
    </InvitationShell>
  );
}
