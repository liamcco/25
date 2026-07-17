import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LATE_RESPONSE_DECLINED_MESSAGE } from "@/lib/rsvp-policy";

export type RsvpFeedbackSearchParams = {
  rsvpDeclinedLate?: string;
  rsvpSaved?: string;
};

export function RsvpFeedback({
  feedback,
}: {
  feedback: RsvpFeedbackSearchParams | undefined;
}) {
  return (
    <>
      {feedback?.rsvpSaved === "1" ? (
        <Alert>
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>Your RSVP has been saved.</AlertDescription>
        </Alert>
      ) : null}

      {feedback?.rsvpDeclinedLate === "1" ? (
        <Alert>
          <AlertTitle>RSVP not saved</AlertTitle>
          <AlertDescription>{LATE_RESPONSE_DECLINED_MESSAGE}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
