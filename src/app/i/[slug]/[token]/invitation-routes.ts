export function createRsvpYesUrl(invitationUrl: string) {
  return `${invitationUrl.replace(/\/$/, "")}/rsvp-yes`;
}
