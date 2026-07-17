"use client";

import { useRef } from "react";
import { setGuestInvitationSent } from "@/app/admin/actions";

type InvitationSentCheckboxProps = {
  defaultChecked: boolean;
  guestId: string;
  guestName: string;
};

export function InvitationSentCheckbox({
  defaultChecked,
  guestId,
  guestName,
}: InvitationSentCheckboxProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form action={setGuestInvitationSent} ref={formRef}>
      <input type="hidden" name="guestId" value={guestId} />
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          aria-label={`Inbjudan skickad till ${guestName}`}
          className="size-4 rounded border-input accent-primary"
          defaultChecked={defaultChecked}
          name="invitationSent"
          onChange={() => formRef.current?.requestSubmit()}
          type="checkbox"
        />
        <span className="sr-only">Inbjudan skickad</span>
      </label>
    </form>
  );
}
