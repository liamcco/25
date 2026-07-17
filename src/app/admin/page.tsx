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
import { InvitationSentCheckbox } from "@/components/invitation-sent-checkbox";
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
            <p className="text-sm font-medium text-muted-foreground">Adminvy</p>
            <h1 className="text-3xl font-semibold tracking-normal">Admin</h1>
          </div>
        </header>

        <AdminStatusAlerts params={params} />

        <Tabs defaultValue={defaultTab} className="gap-4">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
            <TabsTrigger value="overview">
              <ClipboardList />
              Översikt
            </TabsTrigger>
            <TabsTrigger value="guests">
              <Users />
              Gästlista
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings />
              Festinställningar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="size-4" />
                  Översikt
                </CardTitle>
                <CardDescription>
                  OSA-sammanställning för den aktuella gästlistan.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <div className="grid gap-3 sm:grid-cols-4">
                  <ResponseCount
                    label="Skickade inbjudningar"
                    value={responseSummary.totalInvitationsSent}
                  />
                  <ResponseCount
                    label="Inte svarat av skickade"
                    value={responseSummary.notResponded}
                  />
                  <ResponseCount label="Ja" value={responseSummary.yes} />
                  <ResponseCount label="Nej" value={responseSummary.no} />
                </div>
                {responseSummary.yes + responseSummary.no === 0 ? (
                  <EmptyState
                    icon={<ClipboardList />}
                    title="Inga svar ännu"
                    description="Gästernas svar visas här när någon har sparat sitt OSA."
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
                  Gästlista
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <form
                  action={createGuest}
                  className="flex flex-col gap-3 sm:flex-row"
                >
                  <Field className="flex-1">
                    <FieldLabel htmlFor="newGuestDisplayName">
                      Visningsnamn
                    </FieldLabel>
                    <FieldDescription id="newGuestDisplayName-description">
                      Namnet som visas på gästens inbjudan.
                    </FieldDescription>
                    <Input
                      id="newGuestDisplayName"
                      name="displayName"
                      placeholder="Anna Andersson"
                      aria-describedby="newGuestDisplayName-description"
                      required
                    />
                  </Field>
                  <div className="flex items-end">
                    <PendingSubmitButton pendingLabel="Skapar gäst...">
                      <UserPlus />
                      Skapa gäst
                    </PendingSubmitButton>
                  </div>
                </form>

                {guests.length === 0 ? (
                  <EmptyState
                    icon={<Users />}
                    title="Inga gäster ännu"
                    description="Skapa den första gästen för att generera en inbjudningslänk."
                  />
                ) : (
                  <div className="rounded-lg border bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Namn</TableHead>
                          <TableHead className="w-28">Skickad</TableHead>
                          <TableHead>OSA-status</TableHead>
                          <TableHead className="w-32">Kopiera länk</TableHead>
                          <TableHead className="w-32">Ändra</TableHead>
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
                              <InvitationSentCheckbox
                                defaultChecked={guest.invitationSent}
                                guestId={guest.id}
                                guestName={guest.displayName}
                              />
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
                                aria-label={`Öppna gästdetaljer för ${guest.displayName}`}
                              >
                                <Pencil />
                                Ändra
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
                  Festinställningar
                </CardTitle>
              </CardHeader>
              <form action={savePartySettings} className="flex flex-col gap-6">
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="title">Titel</FieldLabel>
                      <Input
                        id="title"
                        name="title"
                        defaultValue={settings.title}
                        aria-describedby="title-description"
                        required
                      />
                      <FieldDescription id="title-description">
                        Visas som rubrik på inbjudan.
                      </FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="startsAt">Datum och tid</FieldLabel>
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
                        Ange festens starttid i Europe/Stockholm-tid.
                      </FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="location">
                        Plats och praktisk info
                      </FieldLabel>
                      <Textarea
                        id="location"
                        name="location"
                        defaultValue={settings.location}
                        aria-describedby="location-description"
                        required
                      />
                      <FieldDescription id="location-description">
                        Inkludera adress och ankomstinformation som gästerna
                        behöver innan de svarar.
                      </FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="dressCode">Klädkod</FieldLabel>
                      <Input
                        id="dressCode"
                        name="dressCode"
                        defaultValue={settings.dressCode}
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="publicInfo">
                        Öppen festinfo
                      </FieldLabel>
                      <Textarea
                        id="publicInfo"
                        name="publicInfo"
                        defaultValue={settings.publicInfo}
                        aria-describedby="publicInfo-description"
                        required
                      />
                      <FieldDescription id="publicInfo-description">
                        Synlig för alla gäster med en aktiv inbjudningslänk.
                      </FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="confirmedInfo">
                        Hemlig information
                      </FieldLabel>
                      <Textarea
                        id="confirmedInfo"
                        name="confirmedInfo"
                        defaultValue={settings.confirmedInfo}
                        aria-describedby="confirmedInfo-description"
                        required
                      />
                      <FieldDescription id="confirmedInfo-description">
                        Synlig först efter att en gäst har svarat ja.
                      </FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="lateResponsePolicy">
                        Policy för sena svar
                      </FieldLabel>
                      <NativeSelect
                        id="lateResponsePolicy"
                        name="lateResponsePolicy"
                        defaultValue={settings.lateResponsePolicy}
                        className="w-full"
                      >
                        <NativeSelectOption value="decline_late">
                          Neka sena ja-svar
                        </NativeSelectOption>
                        <NativeSelectOption value="accept_late">
                          Acceptera sena ja-svar
                        </NativeSelectOption>
                      </NativeSelect>
                    </Field>
                  </FieldGroup>
                </CardContent>
                <CardFooter>
                  <PendingSubmitButton pendingLabel="Sparar inställningar...">
                    <Save />
                    Spara festinställningar
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
          <AlertTitle>Sparat</AlertTitle>
          <AlertDescription>Festinställningarna har sparats.</AlertDescription>
        </Alert>
      ) : null}
      {params?.guestCreated === "1" ? (
        <Alert>
          <Link2 />
          <AlertTitle>Gäst skapad</AlertTitle>
          <AlertDescription>
            Inbjudningslänken är redo att kopieras eller öppnas.
          </AlertDescription>
        </Alert>
      ) : null}
      {params?.guestSaved === "1" ? (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Gäst sparad</AlertTitle>
          <AlertDescription>
            Den kanoniska inbjudningslänken har uppdaterats.
          </AlertDescription>
        </Alert>
      ) : null}
      {params?.invitationRegenerated === "1" ? (
        <Alert>
          <RefreshCw />
          <AlertTitle>Inbjudan har skapats om</AlertTitle>
          <AlertDescription>
            Den tidigare inbjudningslänken är inte längre aktiv.
          </AlertDescription>
        </Alert>
      ) : null}
      {params?.invitationRevoked === "1" ? (
        <Alert variant="destructive">
          <Ban />
          <AlertTitle>Inbjudan återkallad</AlertTitle>
          <AlertDescription>
            Inbjudningslänken är inte längre aktiv.
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
