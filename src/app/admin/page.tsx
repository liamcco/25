import { redirect } from "next/navigation";
import {
  createGuest,
  regenerateInvitation,
  revokeInvitation,
  saveGuestDisplayName,
  savePartySettings,
} from "@/app/admin/actions";
import { InvitationUrlActions } from "@/components/invitation-url-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  searchParams?: Promise<{
    guestCreated?: string;
    guestSaved?: string;
    invitationRegenerated?: string;
    invitationRevoked?: string;
    saved?: string;
  }>;
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
    <main className="min-h-dvh bg-background px-6 py-8 text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            Admin View
          </p>
          <h1 className="text-3xl font-semibold tracking-normal">
            Party Settings
          </h1>
        </header>

        {params?.saved === "1" ? (
          <Alert>
            <AlertTitle>Saved</AlertTitle>
            <AlertDescription>Party Settings saved.</AlertDescription>
          </Alert>
        ) : null}
        {params?.guestCreated === "1" ? (
          <Alert>
            <AlertTitle>Guest created</AlertTitle>
            <AlertDescription>
              The Invitation URL is ready to copy or open.
            </AlertDescription>
          </Alert>
        ) : null}
        {params?.guestSaved === "1" ? (
          <Alert>
            <AlertTitle>Guest saved</AlertTitle>
            <AlertDescription>
              The canonical Invitation URL has been updated.
            </AlertDescription>
          </Alert>
        ) : null}
        {params?.invitationRegenerated === "1" ? (
          <Alert>
            <AlertTitle>Invitation regenerated</AlertTitle>
            <AlertDescription>
              The previous Invitation URL is no longer active.
            </AlertDescription>
          </Alert>
        ) : null}
        {params?.invitationRevoked === "1" ? (
          <Alert>
            <AlertTitle>Invitation revoked</AlertTitle>
            <AlertDescription>
              The Invitation URL is no longer active.
            </AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Structured invitation content</CardTitle>
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
                    required
                  />
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
                  <FieldDescription>
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
                    required
                  />
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
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirmedInfo">
                    Confirmed Party Info
                  </FieldLabel>
                  <Textarea
                    id="confirmedInfo"
                    name="confirmedInfo"
                    defaultValue={settings.confirmedInfo}
                    required
                  />
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
              <Button type="submit">Save Party Settings</Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guests</CardTitle>
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
                  required
                />
              </Field>
              <div className="flex items-end">
                <Button type="submit">Create Guest</Button>
              </div>
            </form>

            {guests.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No Guests yet.
              </p>
            ) : (
              <div className="divide-y rounded-lg border">
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
                        <Button type="submit" variant="outline">
                          Save Guest
                        </Button>
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
                        <Button type="submit" variant="outline">
                          Regenerate Invitation URL
                        </Button>
                      </form>
                      {guest.invitationUrl ? (
                        <form action={revokeInvitation}>
                          <input
                            type="hidden"
                            name="guestId"
                            value={guest.id}
                          />
                          <Button type="submit" variant="destructive">
                            Revoke Invitation
                          </Button>
                        </form>
                      ) : null}
                    </div>
                    <div className="grid gap-2 rounded-md bg-muted/40 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">RSVP status</span>
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
                      ) : null}
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

function ResponseCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
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
