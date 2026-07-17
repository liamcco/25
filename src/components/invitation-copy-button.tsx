"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type InvitationCopyButtonProps = {
  guestName: string;
  invitationUrl: string | null;
};

export function InvitationCopyButton({
  guestName,
  invitationUrl,
}: InvitationCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyInvitationUrl() {
    if (!invitationUrl) {
      return;
    }

    await navigator.clipboard.writeText(invitationUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copyInvitationUrl}
      disabled={!invitationUrl}
      aria-label={`Copy ${guestName} Invitation URL`}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
