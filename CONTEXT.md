# Party Invitation

This context describes a private party invitation website where each guest uses a unique invitation link to RSVP and view party information.

## Language

**Guest**:
One invited person whose display name is controlled by the host. Each guest has their own invitation and cannot RSVP for a group through the same link.
_Avoid_: Household, group, user account

**Invitation**:
The private guest-facing access link for exactly one guest. Possession of the active invitation link is enough to go directly to that guest's RSVP flow and eligible party information, and each guest has at most one active invitation link at a time.
_Avoid_: Login, account, magic link

**Invitation URL**:
The guest-facing URL in the shape `/i/<guest-name-slug>/<token>`. The guest name slug is decorative and identifiable, while the token is the only authoritative access credential.
_Avoid_: Share URL, login URL

**Revoked Invitation**:
An invitation link that no longer grants guest access. Revoking blocks access for that link, while regenerating creates a new active link for the same guest and invalidates the old one.
_Avoid_: Deleted guest, disabled account

**Admin View**:
The host-only area for creating guests, viewing RSVP status, and managing invitation links. The admin view does not directly change a guest's RSVP.
_Avoid_: Back office, CMS

**RSVP**:
The guest's response to the invitation, especially whether they are attending. A guest may change their RSVP until the RSVP Change Cutoff and may include an optional note to the host; a late accepted RSVP is still a Yes RSVP with late metadata.
_Avoid_: Registration, signup

**RSVP Change Cutoff**:
The moment after which a guest can no longer freely become a Yes RSVP. For this party, the cutoff is 23:59 Europe/Stockholm time on the day before the party; post-cutoff cancellations from Yes to No are still allowed.
_Avoid_: Deadline, lock date

**Late Response Policy**:
The host-controlled setting that determines what a guest sees when trying to become a Yes RSVP after the RSVP Change Cutoff. The policy is either welcoming late guests to drop by or declining late responses because there are too many guests.
_Avoid_: Waitlist, capacity mode

**Public Party Info**:
Admin-editable party information visible through any valid invitation link before the guest has RSVP'd.
_Avoid_: Public website, marketing page

**Confirmed Party Info**:
Admin-editable party information visible through a valid invitation link only after that guest has answered yes. It includes the list of other guests with Yes RSVPs.
_Avoid_: Private page, hidden content

**Attendee List**:
The confirmed-only names-only list of current Yes RSVPs, including late accepted RSVPs. It is visible only to guests whose own RSVP is Yes; RSVP notes remain admin-only and guests cannot hide from the list in v1.
_Avoid_: Guest directory, roster

**Party**:
The single event this invitation website is for. The site does not model multiple parties or sessions.
_Avoid_: Event series, session

**Party Settings**:
The admin-editable structured details for the party, including title, date/time, location/logistics, dress code, public info body, confirmed-only info body, and late response policy.
_Avoid_: CMS content, event configuration
