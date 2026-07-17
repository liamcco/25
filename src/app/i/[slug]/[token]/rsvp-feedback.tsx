import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LATE_RESPONSE_DECLINED_MESSAGE } from "@/lib/rsvp-policy";
import { RsvpToast } from "./rsvp-toast";

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
      <RsvpToast feedback={feedback} />

      {feedback?.rsvpDeclinedLate === "1" ? (
        <Alert>
          <AlertTitle>Svaret sparades inte</AlertTitle>
          <AlertDescription>{LATE_RESPONSE_DECLINED_MESSAGE}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
