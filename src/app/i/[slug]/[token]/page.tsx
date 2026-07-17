import { redirect } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSql, getOrCreatePartySettings } from "@/lib/admin";
import { ensurePersistenceBootstrapped } from "@/lib/db/bootstrap";
import { getGuestAccessByToken } from "@/lib/invitations";
import { getRequestOrigin } from "@/lib/request-origin";

type InvitationPageProps = {
  params: Promise<{
    slug: string;
    token: string;
  }>;
};

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { slug, token } = await params;
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

  const settings = await getOrCreatePartySettings(sql);

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
