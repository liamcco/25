import {
  CalendarDays,
  CheckCircle2,
  LockKeyhole,
  MapPin,
  Send,
  Shirt,
  Sparkles,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { submitRsvp } from "@/app/i/[slug]/[token]/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { PartySettings } from "@/lib/admin";
import { formatRsvpState, type RsvpState } from "@/lib/rsvp-policy";
import type { ConfirmedAttendee } from "@/lib/rsvps";

type InvitationShellProps = {
  children: ReactNode;
};

type InvitationHeaderProps = {
  guestName: string;
  headline: string;
  intro: string;
  rsvp: RsvpState;
  settings: PartySettings;
};

type PartyDetailsCardProps = {
  settings: PartySettings;
};

type RsvpFormCardProps = {
  currentRsvp: RsvpState;
  token: string;
  title?: string;
};

type ConfirmedInfoCardProps = {
  attendees: ConfirmedAttendee[];
  confirmedInfo: string;
};

export function InvitationShell({ children }: InvitationShellProps) {
  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,var(--background),var(--muted))] px-4 py-6 text-foreground sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        {children}
      </div>
    </main>
  );
}

export function InvitationHeader({
  guestName,
  headline,
  intro,
  rsvp,
  settings,
}: InvitationHeaderProps) {
  return (
    <header className="rounded-lg border bg-card px-5 py-6 shadow-sm sm:px-7 sm:py-8">
      <p className="text-sm font-medium text-muted-foreground">
        Invitation for {guestName}
      </p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
        {headline}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
        {intro}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Badge variant="secondary">
          <CalendarDays /> {formatPartyDate(settings.startsAt)}
        </Badge>
        <Badge variant="secondary">
          <MapPin /> {formatLocationSummary(settings.location)}
        </Badge>
        <Badge variant={rsvp.status === "yes" ? "default" : "outline"}>
          <CheckCircle2 /> RSVP: {formatRsvpState(rsvp)}
        </Badge>
      </div>
    </header>
  );
}

export function PartyDetailsCard({ settings }: PartyDetailsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Party details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <InvitationDetail
          icon={<CalendarDays />}
          label="When"
          value={formatPartyDate(settings.startsAt)}
        />
        <InvitationDetail
          icon={<MapPin />}
          label="Location"
          value={settings.location}
        />
        <InvitationDetail
          icon={<Shirt />}
          label="Dress code"
          value={settings.dressCode}
        />
        <InvitationDetail
          icon={<Sparkles />}
          label="Public Party Info"
          value={settings.publicInfo}
        />
      </CardContent>
    </Card>
  );
}

export function RsvpFormCard({
  currentRsvp,
  title = "RSVP",
  token,
}: RsvpFormCardProps) {
  const submitRsvpForToken = submitRsvp.bind(null, token);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <p className="text-base font-medium">
          Current RSVP: {formatRsvpState(currentRsvp)}
        </p>
        <form action={submitRsvpForToken} className="grid gap-4">
          <fieldset className="grid gap-3">
            <legend className="text-sm font-medium text-muted-foreground">
              Your response
            </legend>
            <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/60 has-checked:border-primary has-checked:bg-primary/5">
              <input
                type="radio"
                name="answer"
                value="yes"
                defaultChecked={currentRsvp.status === "yes"}
                required
                className="accent-primary"
              />
              Yes, I will attend
            </label>
            <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/60 has-checked:border-primary has-checked:bg-primary/5">
              <input
                type="radio"
                name="answer"
                value="no"
                defaultChecked={currentRsvp.status === "no"}
                required
                className="accent-primary"
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
            <PendingSubmitButton pendingLabel="Saving RSVP...">
              <Send />
              Save RSVP
            </PendingSubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ConfirmedInfoCard({
  attendees,
  confirmedInfo,
}: ConfirmedInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirmed Party Info</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <InvitationDetail
          icon={<LockKeyhole />}
          label="Confirmed Party Info"
          value={confirmedInfo}
        />
        <section className="grid gap-3" aria-labelledby="attendee-list">
          <h2
            id="attendee-list"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground [&_svg]:size-4"
          >
            <Users />
            Attendee List
          </h2>
          {attendees.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
              No Attendee List entries yet.
            </p>
          ) : (
            <ul className="grid gap-2" data-testid="attendee-list">
              {attendees.map((attendee, index) => (
                <li
                  key={`${attendee.displayName}-${index}`}
                  className="rounded-md border bg-background px-3 py-2 text-base"
                >
                  {attendee.displayName}
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function InvitationDetail({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <section className="grid grid-cols-[1.5rem_1fr] gap-x-3 gap-y-1">
      <div className="mt-0.5 text-muted-foreground [&_svg]:size-4">{icon}</div>
      <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
      <p className="col-start-2 whitespace-pre-wrap text-base leading-7">
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

function formatLocationSummary(location: string) {
  return location.split(/\r?\n/, 1)[0]?.trim() || "Location TBD";
}
