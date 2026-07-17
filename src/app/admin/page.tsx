import {
  Ban,
  CheckCircle2,
  ClipboardList,
  Link2,
  RefreshCw,
  Save,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import {
  createGuest,
  regenerateInvitation,
  revokeInvitation,
  saveGuestDisplayName,
  savePartySettings,
} from "@/app/admin/actions";
import { InvitationUrlActions } from "@/components/invitation-url-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { createSql, getOrCreatePartySettings } from "@/lib/admin";
import { getCurrentAdminSession } from "@/lib/admin-session";
import { getRequestOrigin } from "@/lib/request-origin";
import { formatRsvpState } from "@/lib/rsvp-policy";
import { getGuestResponseSummary, listGuestsWithResponses } from "@/lib/rsvps";
import { formatStockholmDateTimeLocal } from "@/lib/stockholm-datetime";

type AdminPageProps = {
  searchParams?: Promise<AdminStatusParams>;
};

type AdminStatusParams = {
  guestCreated?: string;
  guestSaved?: string;
  invitationRegenerated?: string;
  invitationRevoked?: string;
  saved?: string;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  if (!(await getCurrentAdminSession())) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const sql = createSql();
  const origin = await getRequestOrigin();
  const [settings, guests, responseSummary] = await Promise.all([
    getOrCreatePartySettings(sql),
    listGuestsWithResponses(sql, origin),
    getGuestResponseSummary(sql),
  ]);

  return (
    <main className="min-h-dvh bg-muted/30 px-4 py-6 text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Admin View
            </p>
            <h1 className="text-3xl font-semibold tracking-normal">
              Party Settings
            </h1>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            Manage invitation content, Guests, Invitation URLs, and RSVP status
            from one host-only view.
          </p>
        </header>

        <AdminStatusAlerts params={params} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="size-4" />
              Structured invitation content
            </CardTitle>
            <CardDescription>
              These fields drive the guest-facing invitation and late-response
              behavior.
            </CardDescription>
          </CardHeader>
          <form action={savePartySettings} className="flex flex-col gap-6">
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="title">Title</FieldLabel>
                  <Input
                    id="title"
                    name="title"
                    defaultValue={settings.title}
                    aria-describedby="title-description"
                    required
                  />
                  <FieldDescription id="title-description">
                    Shown as the guest-facing invitation headline.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="startsAt">Date and time</FieldLabel>
                  <Input
                    id="startsAt"
                    name="startsAt"
                    type="datetime-local"
                    defaultValue={formatStockholmDateTimeLocal(
                      settings.startsAt,
                    )}
                    required
                  />
                  <FieldDescription id="startsAt-description">
                    Enter the party start in Europe/Stockholm time.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="location">
                    Location and logistics
                  </FieldLabel>
                  <Textarea
                    id="location"
                    name="location"
                    defaultValue={settings.location}
                    aria-describedby="location-description"
                    required
                  />
                  <FieldDescription id="location-description">
                    Include the address and arrival details guests need before
                    RSVP.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="dressCode">Dress code</FieldLabel>
                  <Input
                    id="dressCode"
                    name="dressCode"
                    defaultValue={settings.dressCode}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="publicInfo">
                    Public Party Info
                  </FieldLabel>
                  <Textarea
                    id="publicInfo"
                    name="publicInfo"
                    defaultValue={settings.publicInfo}
                    aria-describedby="publicInfo-description"
                    required
                  />
                  <FieldDescription id="publicInfo-description">
                    Visible to any Guest with an active Invitation URL.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirmedInfo">
                    Confirmed Party Info
                  </FieldLabel>
                  <Textarea
                    id="confirmedInfo"
                    name="confirmedInfo"
                    defaultValue={settings.confirmedInfo}
                    aria-describedby="confirmedInfo-description"
                    required
                  />
                  <FieldDescription id="confirmedInfo-description">
                    Visible only after a Guest answers Yes.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="lateResponsePolicy">
                    Late Response Policy
                  </FieldLabel>
                  <NativeSelect
                    id="lateResponsePolicy"
                    name="lateResponsePolicy"
                    defaultValue={settings.lateResponsePolicy}
                    className="w-full"
                  >
                    <NativeSelectOption value="decline_late">
                      Decline late Yes responses
                    </NativeSelectOption>
                    <NativeSelectOption value="accept_late">
                      Accept late Yes responses
                    </NativeSelectOption>
                  </NativeSelect>
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter>
              <PendingSubmitButton pendingLabel="Saving settings...">
                <Save />
                Save Party Settings
              </PendingSubmitButton>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" />
              Guests
            </CardTitle>
            <CardDescription>
              Create Guests and manage each active reusable Invitation URL.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="grid gap-3 sm:grid-cols-5">
              <ResponseCount
                label="Total guests"
                value={responseSummary.totalGuests}
              />
              <ResponseCount
                label="Not responded"
                value={responseSummary.notResponded}
              />
              <ResponseCount label="Yes" value={responseSummary.yes} />
              <ResponseCount label="Yes late" value={responseSummary.yesLate} />
              <ResponseCount label="No" value={responseSummary.no} />
            </div>
            {responseSummary.yes +
              responseSummary.yesLate +
              responseSummary.no ===
            0 ? (
              <EmptyState
                icon={<ClipboardList />}
                title="No RSVPs yet"
                description="Guest responses will appear here after someone saves an RSVP."
              />
            ) : null}

            <form
              action={createGuest}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <Field className="flex-1">
                <FieldLabel htmlFor="newGuestDisplayName">
                  Display name
                </FieldLabel>
                <Input
                  id="newGuestDisplayName"
                  name="displayName"
                  placeholder="Ada Lovelace"
                  aria-describedby="newGuestDisplayName-description"
                  required
                />
                <FieldDescription id="newGuestDisplayName-description">
                  The name shown on this Guest&apos;s Invitation.
                </FieldDescription>
              </Field>
              <div className="flex items-end">
                <PendingSubmitButton pendingLabel="Creating Guest...">
                  <UserPlus />
                  Create Guest
                </PendingSubmitButton>
              </div>
            </form>

            {guests.length === 0 ? (
              <EmptyState
                icon={<Users />}
                title="No Guests yet"
                description="Create the first Guest to generate an Invitation URL."
              />
            ) : (
              <div className="divide-y rounded-lg border bg-background">
                {guests.map((guest) => (
                  <div
                    key={guest.id}
                    data-testid={`guest-row-${guest.guestNameSlug}`}
                    className="flex flex-col gap-4 p-4"
                  >
                    <form
                      action={saveGuestDisplayName}
                      className="flex flex-col gap-3 sm:flex-row"
                    >
                      <input type="hidden" name="guestId" value={guest.id} />
                      <Field className="flex-1">
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
                      <div className="flex items-end">
                        <PendingSubmitButton
                          variant="outline"
                          pendingLabel="Saving Guest..."
                        >
                          <Save />
                          Save Guest
                        </PendingSubmitButton>
                      </div>
                    </form>
                    {guest.invitationUrl ? (
                      <InvitationUrlActions
                        guestName={guest.displayName}
                        invitationUrl={guest.invitationUrl}
                      />
                    ) : (
                      <Alert>
                        <AlertTitle>Invitation revoked</AlertTitle>
                        <AlertDescription>
                          Regenerate this Guest&apos;s Invitation URL to restore
                          access.
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <form action={regenerateInvitation}>
                        <input type="hidden" name="guestId" value={guest.id} />
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
                          <input
                            type="hidden"
                            name="guestId"
                            value={guest.id}
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
                    <div className="grid gap-2 rounded-md bg-muted/50 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-2 font-medium">
                          <ClipboardList className="size-4 text-muted-foreground" />
                          RSVP status
                        </span>
                        <span
                          data-testid={`guest-rsvp-status-${guest.guestNameSlug}`}
                        >
                          {formatRsvpState(guest.rsvp)}
                        </span>
                      </div>
                      {guest.rsvpNote ? (
                        <div className="grid gap-1">
                          <span className="font-medium">RSVP note</span>
                          <p
                            data-testid={`guest-rsvp-note-${guest.guestNameSlug}`}
                            className="whitespace-pre-wrap text-muted-foreground"
                          >
                            {guest.rsvpNote}
                          </p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          No RSVP note yet.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function AdminStatusAlerts({
  params,
}: {
  params: AdminStatusParams | undefined;
}) {
  return (
    <>
      {params?.saved === "1" ? (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>Party Settings saved.</AlertDescription>
        </Alert>
      ) : null}
      {params?.guestCreated === "1" ? (
        <Alert>
          <Link2 />
          <AlertTitle>Guest created</AlertTitle>
          <AlertDescription>
            The Invitation URL is ready to copy or open.
          </AlertDescription>
        </Alert>
      ) : null}
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

function EmptyState({
  description,
  icon,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="grid justify-items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center">
      <div className="rounded-full bg-muted p-2 text-muted-foreground [&_svg]:size-5">
        {icon}
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ResponseCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        data-testid={`response-count-${label.toLowerCase().replace(/\s+/g, "-")}`}
        className="text-2xl font-semibold"
      >
        {value}
      </p>
    </div>
  );
}
