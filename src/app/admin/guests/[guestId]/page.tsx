import {
  Ban,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  Save,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  regenerateInvitation,
  revokeInvitation,
  saveGuestDisplayName,
} from "@/app/admin/actions";
import { InvitationUrlActions } from "@/components/invitation-url-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createSql } from "@/lib/admin";
import { getCurrentAdminSession } from "@/lib/admin-session";
import { getRequestOrigin } from "@/lib/request-origin";
import { formatRsvpState } from "@/lib/rsvp-policy";
import { listGuestsWithResponses } from "@/lib/rsvps";
import { cn } from "@/lib/utils";

type GuestDetailPageProps = {
  params: Promise<{ guestId: string }>;
  searchParams?: Promise<GuestDetailStatusParams>;
};

type GuestDetailStatusParams = {
  guestSaved?: string;
  invitationRegenerated?: string;
  invitationRevoked?: string;
};

export default async function GuestDetailPage({
  params,
  searchParams,
}: GuestDetailPageProps) {
  if (!(await getCurrentAdminSession())) {
    redirect("/admin/login");
  }

  const { guestId } = await params;
  const statusParams = await searchParams;
  const sql = createSql();
  const origin = await getRequestOrigin();
  const guests = await listGuestsWithResponses(sql, origin);
  const guest = guests.find((candidate) => candidate.id === guestId);

  if (!guest) {
    notFound();
  }

  const detailPath = `/admin/guests/${guest.id}`;

  return (
    <main className="min-h-dvh bg-muted/30 px-4 py-6 text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <Link
            href="/admin?tab=guests"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "w-fit",
            )}
          >
            <Users />
            Guest list
          </Link>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Guest detail
            </p>
            <h1 className="text-3xl font-semibold tracking-normal">
              {guest.displayName}
            </h1>
          </div>
        </header>

        <GuestDetailStatusAlerts params={statusParams} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="size-4" />
              Guest settings
            </CardTitle>
            <CardDescription>
              Edit the displayed name and manage this guest&apos;s active
              invitation link.
            </CardDescription>
          </CardHeader>
          <form action={saveGuestDisplayName} className="flex flex-col gap-6">
            <CardContent>
              <input type="hidden" name="guestId" value={guest.id} />
              <input
                type="hidden"
                name="redirectTo"
                value={`${detailPath}?guestSaved=1`}
              />
              <Field>
                <FieldLabel htmlFor={`displayName-${guest.id}`}>
                  Display name
                </FieldLabel>
                <Input
                  id={`displayName-${guest.id}`}
                  name="displayName"
                  defaultValue={guest.displayName}
                  required
                />
              </Field>
            </CardContent>
            <CardFooter>
              <PendingSubmitButton
                variant="outline"
                pendingLabel="Saving Guest..."
              >
                <Save />
                Save Guest
              </PendingSubmitButton>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-4" />
              Invitation and RSVP
            </CardTitle>
            <CardDescription>
              Current invitation access and the latest saved RSVP state.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {guest.invitationUrl ? (
              <InvitationUrlActions
                guestName={guest.displayName}
                invitationUrl={guest.invitationUrl}
              />
            ) : (
              <Alert>
                <AlertTitle>Invitation revoked</AlertTitle>
                <AlertDescription>
                  Regenerate this Guest&apos;s Invitation URL to restore access.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-2">
              <form action={regenerateInvitation}>
                <input type="hidden" name="guestId" value={guest.id} />
                <input
                  type="hidden"
                  name="redirectTo"
                  value={`${detailPath}?invitationRegenerated=1`}
                />
                <PendingSubmitButton
                  variant="outline"
                  pendingLabel="Regenerating..."
                >
                  <RefreshCw />
                  Regenerate Invitation URL
                </PendingSubmitButton>
              </form>
              {guest.invitationUrl ? (
                <form action={revokeInvitation}>
                  <input type="hidden" name="guestId" value={guest.id} />
                  <input
                    type="hidden"
                    name="redirectTo"
                    value={`${detailPath}?invitationRevoked=1`}
                  />
                  <PendingSubmitButton
                    variant="destructive"
                    pendingLabel="Revoking..."
                  >
                    <Ban />
                    Revoke Invitation
                  </PendingSubmitButton>
                </form>
              ) : null}
            </div>

            <div className="grid gap-3 rounded-md bg-muted/50 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">RSVP status</span>
                <Badge
                  variant={
                    guest.rsvp.status === "no"
                      ? "destructive"
                      : guest.rsvp.status === "not_responded"
                        ? "outline"
                        : "secondary"
                  }
                  data-testid={`guest-rsvp-status-${guest.guestNameSlug}`}
                >
                  {formatRsvpState(guest.rsvp)}
                </Badge>
              </div>
              <div className="grid gap-1">
                <span className="font-medium">RSVP note</span>
                {guest.rsvpNote ? (
                  <p
                    data-testid={`guest-rsvp-note-${guest.guestNameSlug}`}
                    className="whitespace-pre-wrap text-muted-foreground"
                  >
                    {guest.rsvpNote}
                  </p>
                ) : (
                  <p className="text-muted-foreground">No RSVP note yet.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function GuestDetailStatusAlerts({
  params,
}: {
  params: GuestDetailStatusParams | undefined;
}) {
  return (
    <>
      {params?.guestSaved === "1" ? (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Guest saved</AlertTitle>
          <AlertDescription>
            The canonical Invitation URL has been updated.
          </AlertDescription>
        </Alert>
      ) : null}
      {params?.invitationRegenerated === "1" ? (
        <Alert>
          <RefreshCw />
          <AlertTitle>Invitation regenerated</AlertTitle>
          <AlertDescription>
            The previous Invitation URL is no longer active.
          </AlertDescription>
        </Alert>
      ) : null}
      {params?.invitationRevoked === "1" ? (
        <Alert variant="destructive">
          <Ban />
          <AlertTitle>Invitation revoked</AlertTitle>
          <AlertDescription>
            The Invitation URL is no longer active.
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
