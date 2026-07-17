export type RsvpAnswer = "yes" | "no";

export type RsvpState =
  | { status: "not_responded" }
  | { status: "yes"; isLate: boolean }
  | { status: "no" };

export type LateResponsePolicy = "accept_late" | "decline_late";

export type RsvpChangeRequest = {
  current: RsvpState;
  requestedAnswer: RsvpAnswer;
  now: Date;
  partyStartsAt: Date;
  lateResponsePolicy: LateResponsePolicy;
};

export type RsvpChangeDecision =
  | {
      allowed: true;
      next: Exclude<RsvpState, { status: "not_responded" }>;
      message?: string;
    }
  | {
      allowed: false;
      message: string;
    };

const STOCKHOLM_TIME_ZONE = "Europe/Stockholm";

type StockholmDateParts = {
  year: number;
  month: number;
  day: number;
};

export function calculateRsvpChangeCutoff(partyStartsAt: Date): Date {
  const partyDate = getStockholmDateParts(partyStartsAt);
  const cutoffDay = new Date(
    Date.UTC(partyDate.year, partyDate.month - 1, partyDate.day - 1, 12),
  );
  const cutoffDate = getStockholmDateParts(cutoffDay);

  return stockholmLocalTimeToUtc({
    ...cutoffDate,
    hour: 23,
    minute: 59,
    second: 0,
    millisecond: 0,
  });
}

export function evaluateRsvpChange(
  request: RsvpChangeRequest,
): RsvpChangeDecision {
  const cutoff = calculateRsvpChangeCutoff(request.partyStartsAt);
  const isAfterCutoff = request.now > cutoff;

  if (!isAfterCutoff) {
    return { allowed: true, next: toRsvpState(request.requestedAnswer, false) };
  }

  if (request.requestedAnswer === "no") {
    return { allowed: true, next: { status: "no" } };
  }

  if (request.current.status === "yes") {
    return {
      allowed: true,
      next: { status: "yes", isLate: request.current.isLate },
    };
  }

  if (request.lateResponsePolicy === "accept_late") {
    return {
      allowed: true,
      message: "You can still drop by.",
      next: { status: "yes", isLate: true },
    };
  }

  return {
    allowed: false,
    message: "There are too many guests, sorry.",
  };
}

export function formatRsvpState(rsvp: RsvpState) {
  if (rsvp.status === "not_responded") {
    return "Not responded";
  }

  if (rsvp.status === "yes" && rsvp.isLate) {
    return "Yes late";
  }

  return rsvp.status === "yes" ? "Yes" : "No";
}

function toRsvpState(
  answer: RsvpAnswer,
  isLate: boolean,
): Exclude<RsvpState, { status: "not_responded" }> {
  if (answer === "yes") {
    return { status: "yes", isLate };
  }

  return { status: "no" };
}

function getStockholmDateParts(date: Date): StockholmDateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: STOCKHOLM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(getPart(parts, "year")),
    month: Number(getPart(parts, "month")),
    day: Number(getPart(parts, "day")),
  };
}

function stockholmLocalTimeToUtc(
  local: StockholmDateParts & {
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
  },
): Date {
  const utcGuess = new Date(
    Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
      local.millisecond,
    ),
  );
  const offsetMs = getTimeZoneOffsetMs(utcGuess, STOCKHOLM_TIME_ZONE);

  return new Date(utcGuess.getTime() - offsetMs);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const asUtc = Date.UTC(
    Number(getPart(parts, "year")),
    Number(getPart(parts, "month")) - 1,
    Number(getPart(parts, "day")),
    Number(getPart(parts, "hour")),
    Number(getPart(parts, "minute")),
    Number(getPart(parts, "second")),
  );

  return asUtc - date.getTime();
}

function getPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  const value = parts.find((part) => part.type === type)?.value;

  if (value === undefined) {
    throw new Error(`Missing ${type} in formatted date`);
  }

  return value;
}
