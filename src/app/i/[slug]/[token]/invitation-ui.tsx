import {
  CalendarDays,
  LockKeyhole,
  MapPin,
  Shirt,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { RsvpForm } from "@/app/i/[slug]/[token]/rsvp-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PartySettings } from "@/lib/admin";
import type { RsvpState } from "@/lib/rsvp-policy";

type InvitationShellProps = {
  children: ReactNode;
};

type InvitationHeaderProps = {
  guestName: string;
  headline: string;
  intro: string;
};

type PartyDetailsCardProps = {
  settings: PartySettings;
};

type RsvpFormCardProps = {
  currentRsvp: RsvpState;
  token: string;
  title?: string;
};

type ConfirmedDetailsCardProps = {
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <RsvpForm currentRsvp={currentRsvp} token={token} />
      </CardContent>
    </Card>
  );
}

export function ConfirmedDetailsCard({
  confirmedInfo,
}: ConfirmedDetailsCardProps) {
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
