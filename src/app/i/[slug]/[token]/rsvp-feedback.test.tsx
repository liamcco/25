import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { LATE_RESPONSE_DECLINED_MESSAGE } from "@/lib/rsvp-policy";
import { RsvpFeedback } from "./rsvp-feedback";

describe("OSA-feedback", () => {
  test("visar meddelandet efter ett nekat sent ja-svar", () => {
    const markup = renderToStaticMarkup(
      <RsvpFeedback feedback={{ rsvpDeclinedLate: "1" }} />,
    );

    expect(markup).toContain("Svaret sparades inte");
    expect(markup).toContain(LATE_RESPONSE_DECLINED_MESSAGE);
    expect(markup).not.toContain("Ditt svar sparades!");
  });
});
