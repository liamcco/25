"use client";

import { Pencil } from "lucide-react";
import { useMemo } from "react";
import { useFormStatus } from "react-dom";
import { submitRsvp } from "@/app/i/[slug]/[token]/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type DeclineRsvpDialogProps = {
  guestName: string;
  token: string;
};

export function DeclineRsvpDialog({
  guestName,
  token,
}: DeclineRsvpDialogProps) {
  const submitRsvpForToken = useMemo(
    () => submitRsvp.bind(null, token),
    [token],
  );

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={`Edit ${guestName} RSVP`}
          />
        }
      >
        <Pencil />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit RSVP</DialogTitle>
          <DialogDescription>
            This will update your RSVP and return you to the public invitation
            page.
          </DialogDescription>
        </DialogHeader>
        <form action={submitRsvpForToken} className="grid gap-4">
          <input type="hidden" name="answer" value="no" />
          <label className="flex items-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
            <input
              type="radio"
              name="confirm-decline"
              value="yes"
              defaultChecked
              className="accent-destructive"
              readOnly
            />
            Can&apos;t go anymore :(
          </label>
          <DialogFooter>
            <DeclineSubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeclineSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Saving..." : "I am sure"}
    </Button>
  );
}
