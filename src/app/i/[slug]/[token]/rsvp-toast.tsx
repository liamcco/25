"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import type { RsvpFeedbackSearchParams } from "@/app/i/[slug]/[token]/rsvp-feedback";

export function RsvpToast({
  feedback,
}: {
  feedback: RsvpFeedbackSearchParams | undefined;
}) {
  useEffect(() => {
    if (feedback?.rsvpSaved === "1") {
      toast.success("Your choice was saved!");
    }
  }, [feedback?.rsvpSaved]);

  return null;
}
