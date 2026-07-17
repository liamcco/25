import { redirect } from "next/navigation";
import { submitRsvp } from "@/app/i/[slug]/[token]/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createSql, getOrCreatePartySettings } from "@/lib/admin";
import { ensurePersistenceBootstrapped } from "@/lib/db/bootstrap";
import { getGuestAccessByToken } from "@/lib/invitations";
import { getRequestOrigin } from "@/lib/request-origin";
import { formatRsvpState } from "@/lib/rsvp-policy";
import { getGuestRsvp, listConfirmedAttendees } from "@/lib/rsvps";

type InvitationPageProps = {
  params: Promise<{
    slug: string;
    token: string;
  }>;
  searchParams?: Promise<{
    rsvpSaved?: string;
  }>;
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
      <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-10 text-foreground">
        <Alert className="max-w-md">
          <AlertTitle>Invitation unavailable</AlertTitle>
          <AlertDescription>
            This invitation link is invalid or no longer active.
          </AlertDescription>
        </Alert>
      </main>
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
  const attendeeList =
    rsvp.status === "yes" ? await listConfirmedAttendees(sql) : [];
  const submitRsvpForToken = submitRsvp.bind(null, token);

  return (
    <main className="min-h-dvh bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            Invitation for {access.guest.displayName}
          </p>
          <h1 className="text-4xl font-semibold tracking-normal">
            {settings.title || "Private invitation"}
          </h1>
        </header>

        {feedback?.rsvpSaved === "1" ? (
          <Alert>
            <AlertTitle>Saved</AlertTitle>
            <AlertDescription>Your RSVP has been saved.</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Party details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <InvitationDetail
              label="When"
              value={formatPartyDate(settings.startsAt)}
            />
            <InvitationDetail label="Location" value={settings.location} />
            <InvitationDetail label="Dress code" value={settings.dressCode} />
            <InvitationDetail
              label="Public Party Info"
              value={settings.publicInfo}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>RSVP</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <p className="text-base font-medium">
              Current RSVP: {formatRsvpState(rsvp)}
            </p>
            <form action={submitRsvpForToken} className="grid gap-4">
              <fieldset className="grid gap-3">
                <legend className="text-sm font-medium text-muted-foreground">
                  Your response
                </legend>
                <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="answer"
                    value="yes"
                    defaultChecked={rsvp.status === "yes"}
                    required
                  />
                  Yes, I will attend
                </label>
                <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="answer"
                    value="no"
                    defaultChecked={rsvp.status === "no"}
                    required
                  />
                  No, I cannot attend
                </label>
              </fieldset>
              <label className="grid gap-2 text-sm font-medium" htmlFor="note">
                Note to host
                <Textarea
                  id="note"
                  name="note"
                  placeholder="Optional"
                  className="font-normal"
                />
              </label>
              <div>
                <Button type="submit">Save RSVP</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {rsvp.status === "yes" ? (
          <Card>
            <CardHeader>
              <CardTitle>Confirmed Party Info</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <InvitationDetail
                label="Confirmed Party Info"
                value={settings.confirmedInfo}
              />
              <section className="grid gap-3" aria-labelledby="attendee-list">
                <h2
                  id="attendee-list"
                  className="text-sm font-medium text-muted-foreground"
                >
                  Attendee List
                </h2>
                <ul className="grid gap-2" data-testid="attendee-list">
                  {attendeeList.map((attendee, index) => (
                    <li
                      key={`${attendee.displayName}-${index}`}
                      className="rounded-md border px-3 py-2 text-base"
                    >
                      {attendee.displayName}
                    </li>
                  ))}
                </ul>
              </section>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}

function InvitationDetail({ label, value }: { label: string; value: string }) {
  return (
    <section className="grid gap-1">
      <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
      <p className="whitespace-pre-wrap text-base leading-7">
        {value || "TBD"}
      </p>
    </section>
  );
}

function formatPartyDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Stockholm",
  }).format(date);
}
