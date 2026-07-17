import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { LATE_RESPONSE_DECLINED_MESSAGE } from "@/lib/rsvp-policy";
import { RsvpFeedback } from "./rsvp-feedback";

describe("RSVP feedback", () => {
  test("shows the declined-late message after a rejected late Yes attempt", () => {
    const markup = renderToStaticMarkup(
      <RsvpFeedback feedback={{ rsvpDeclinedLate: "1" }} />,
    );

    expect(markup).toContain("RSVP not saved");
    expect(markup).toContain(LATE_RESPONSE_DECLINED_MESSAGE);
    expect(markup).not.toContain("Your RSVP has been saved.");
  });
});
