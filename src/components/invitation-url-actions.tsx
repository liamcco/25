"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type InvitationUrlActionsProps = {
  guestName: string;
  invitationUrl: string;
};

export function InvitationUrlActions({
  guestName,
  invitationUrl,
}: InvitationUrlActionsProps) {
  const [copied, setCopied] = useState(false);

  async function copyInvitationUrl() {
    await navigator.clipboard.writeText(invitationUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        aria-label={`${guestName} Invitation URL`}
        value={invitationUrl}
        readOnly
        className="font-mono text-xs"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={copyInvitationUrl}
          aria-label={`Copy ${guestName} Invitation URL`}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            window.open(invitationUrl, "_blank", "noopener,noreferrer")
          }
          aria-label={`Open ${guestName} Invitation URL`}
        >
          <ExternalLink />
          Open
        </Button>
      </div>
    </div>
  );
}
