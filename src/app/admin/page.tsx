import {
  Ban,
  CheckCircle2,
  ClipboardList,
  Link2,
  Pencil,
  RefreshCw,
  Save,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createGuest, savePartySettings } from "@/app/admin/actions";
import { InvitationCopyButton } from "@/components/invitation-copy-button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createSql, getOrCreatePartySettings } from "@/lib/admin";
import { getCurrentAdminSession } from "@/lib/admin-session";
import { getRequestOrigin } from "@/lib/request-origin";
import { formatRsvpState } from "@/lib/rsvp-policy";
import { getGuestResponseSummary, listGuestsWithResponses } from "@/lib/rsvps";
import { formatStockholmDateTimeLocal } from "@/lib/stockholm-datetime";
import { cn } from "@/lib/utils";

type AdminPageProps = {
  searchParams?: Promise<AdminStatusParams>;
};

type AdminStatusParams = {
  guestCreated?: string;
  guestSaved?: string;
  invitationRegenerated?: string;
  invitationRevoked?: string;
  saved?: string;
  tab?: string;
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
  const defaultTab = getDefaultAdminTab(params);

  return (
    <main className="min-h-dvh bg-muted/30 px-4 py-6 text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Admin View
            </p>
            <h1 className="text-3xl font-semibold tracking-normal">Admin</h1>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            Manage invitation content, guests, invitation URLs, and RSVP status
            from one host-only view.
          </p>
        </header>

        <AdminStatusAlerts params={params} />

        <Tabs defaultValue={defaultTab} className="gap-4">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
            <TabsTrigger value="overview">
              <ClipboardList />
              Overview statistics
            </TabsTrigger>
            <TabsTrigger value="guests">
              <Users />
              Guest list
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings />
              Party settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="size-4" />
                  Overview statistics
                </CardTitle>
                <CardDescription>
                  RSVP totals across the current guest list.
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
                  <ResponseCount
                    label="Yes late"
                    value={responseSummary.yesLate}
                  />
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guests">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-4" />
                  Guest list
                </CardTitle>
                <CardDescription>
                  Create guests and scan RSVP status without opening every
                  record.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
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
                  <div className="rounded-lg border bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>RSVP status</TableHead>
                          <TableHead className="w-32">Copy link</TableHead>
                          <TableHead className="w-32">Edit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {guests.map((guest) => (
                          <TableRow
                            key={guest.id}
                            data-testid={`guest-row-${guest.guestNameSlug}`}
                          >
                            <TableCell className="font-medium">
                              {guest.displayName}
                            </TableCell>
                            <TableCell>
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
                            </TableCell>
                            <TableCell>
                              <InvitationCopyButton
                                guestName={guest.displayName}
                                invitationUrl={guest.invitationUrl}
                              />
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/admin/guests/${guest.id}`}
                                className={cn(
                                  buttonVariants({
                                    variant: "outline",
                                    size: "sm",
                                  }),
                                )}
                                aria-label={`Open ${guest.displayName} guest detail page`}
                              >
                                <Pencil />
                                Edit
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="size-4" />
                  Party settings
                </CardTitle>
                <CardDescription>
                  These fields drive the guest-facing invitation and
                  late-response behavior.
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
                        Include the address and arrival details guests need
                        before RSVP.
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
          </TabsContent>
        </Tabs>
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

function getDefaultAdminTab(params: AdminStatusParams | undefined) {
  if (
    params?.tab === "overview" ||
    params?.tab === "guests" ||
    params?.tab === "settings"
  ) {
    return params.tab;
  }

  if (params?.saved === "1") {
    return "settings";
  }

  if (params?.guestCreated === "1") {
    return "guests";
  }

  return "overview";
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
