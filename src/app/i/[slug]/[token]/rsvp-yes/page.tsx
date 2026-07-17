import { CircleCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { DeclineRsvpDialog } from "@/app/i/[slug]/[token]/decline-rsvp-dialog";
import {
  ConfirmedDetailsCard,
  InvitationHeader,
  InvitationShell,
  PartyDetailsCard,
} from "@/app/i/[slug]/[token]/invitation-ui";
import {
  RsvpFeedback,
  type RsvpFeedbackSearchParams,
} from "@/app/i/[slug]/[token]/rsvp-feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const otherAttendees = attendeeList.filter(
    (attendee) => attendee.displayName !== access.guest.displayName,
  );

  return (
    <InvitationShell>
      <InvitationHeader
        guestName={access.guest.displayName}
        headline="Du står på listan:)"
      />

      <RsvpFeedback feedback={feedback} />
      <Tabs defaultValue="details" className="gap-4">
        <TabsList className="w-full justify-start sm:w-fit">
          <TabsTrigger value="details">Detaljer</TabsTrigger>
          <TabsTrigger value="guest-list">Gästlista</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="grid gap-5">
          <PartyDetailsCard settings={settings} />
          <ConfirmedDetailsCard confirmedInfo={settings.confirmedInfo} />
        </TabsContent>

        <TabsContent value="guest-list">
          <Card>
            <CardHeader>
              <CardTitle>Dessa har tackat ja</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Namn</TableHead>
                    <TableHead className="w-16 text-right">
                      <span className="sr-only">Ändra svar</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody data-testid="attendee-list">
                  <TableRow>
                    <TableCell className="font-medium">
                      <AcceptedGuestName name={access.guest.displayName} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DeclineRsvpDialog
                        guestName={access.guest.displayName}
                        token={token}
                      />
                    </TableCell>
                  </TableRow>
                  {otherAttendees.map((attendee, index) => (
                    <TableRow key={`${attendee.displayName}-${index}`}>
                      <TableCell>
                        <AcceptedGuestName name={attendee.displayName} />
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </InvitationShell>
  );
}

function AcceptedGuestName({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <CircleCheck
        aria-hidden="true"
        className="size-4 shrink-0 text-green-600"
      />
      <span>{name}</span>
    </span>
  );
}
