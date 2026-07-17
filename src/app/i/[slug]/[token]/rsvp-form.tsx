"use client";

import { Send } from "lucide-react";
import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitRsvp } from "@/app/i/[slug]/[token]/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { RsvpAnswer, RsvpState } from "@/lib/rsvp-policy";
import { formatRsvpState } from "@/lib/rsvp-policy";
import { cn } from "@/lib/utils";

type RsvpFormProps = {
  currentRsvp: RsvpState;
  token: string;
};

export function RsvpForm({ currentRsvp, token }: RsvpFormProps) {
  const initialAnswer =
    currentRsvp.status === "not_responded" ? null : currentRsvp.status;
  const [selectedAnswer, setSelectedAnswer] = useState<RsvpAnswer | null>(
    initialAnswer,
  );
  const [note, setNote] = useState("");
  const submitRsvpForToken = useMemo(
    () => submitRsvp.bind(null, token),
    [token],
  );
  const hasNoteChange = initialAnswer !== null && note.trim().length > 0;
  const hasChanged =
    (selectedAnswer !== null && selectedAnswer !== initialAnswer) ||
    hasNoteChange;

  return (
    <form action={submitRsvpForToken} className="grid gap-4">
      <p className="text-base font-medium">
        Nuvarande svar: {formatRsvpState(currentRsvp)}
      </p>
      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium text-muted-foreground">
          Ditt svar
        </legend>
        <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/60 has-checked:border-primary has-checked:bg-primary/5">
          <input
            type="radio"
            name="answer"
            value="yes"
            checked={selectedAnswer === "yes"}
            onChange={() => setSelectedAnswer("yes")}
            required
            className="accent-primary"
          />
          Ja, jag kommer
        </label>
        <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/60 has-checked:border-primary has-checked:bg-primary/5">
          <input
            type="radio"
            name="answer"
            value="no"
            checked={selectedAnswer === "no"}
            onChange={() => setSelectedAnswer("no")}
            required
            className="accent-primary"
          />
          Nej, jag kan inte komma
        </label>
      </fieldset>
      <label className="grid gap-2 text-sm font-medium" htmlFor="note">
        Meddelande till värden
        <Textarea
          id="note"
          name="note"
          placeholder="Valfritt"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="font-normal"
        />
      </label>
      <div>
        <RsvpSubmitButton
          hasChanged={hasChanged}
          selectedAnswer={selectedAnswer}
        />
      </div>
    </form>
  );
}

function RsvpSubmitButton({
  hasChanged,
  selectedAnswer,
}: {
  hasChanged: boolean;
  selectedAnswer: RsvpAnswer | null;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={!hasChanged || pending}
      className={cn(
        "min-w-32",
        hasChanged &&
          selectedAnswer === "yes" &&
          "bg-emerald-600 text-white hover:bg-emerald-700",
        hasChanged &&
          selectedAnswer === "no" &&
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      )}
    >
      <Send />
      {pending ? "Sparar..." : "Spara svar"}
    </Button>
  );
}
