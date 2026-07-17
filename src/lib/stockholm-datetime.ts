const STOCKHOLM_TIME_ZONE = "Europe/Stockholm";

export function formatStockholmDateTimeLocal(date: Date) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: STOCKHOLM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return `${getPart(parts, "year")}-${getPart(parts, "month")}-${getPart(
    parts,
    "day",
  )}T${getPart(parts, "hour")}:${getPart(parts, "minute")}`;
}

export function parseStockholmDateTimeLocal(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    throw new Error("Date and time must be a valid local datetime");
  }

  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
  const utcGuess = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute),
  );
  const stockholmParts = new Intl.DateTimeFormat("en-US", {
    timeZone: STOCKHOLM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(utcGuess);
  const asUtc = Date.UTC(
    Number(getPart(stockholmParts, "year")),
    Number(getPart(stockholmParts, "month")) - 1,
    Number(getPart(stockholmParts, "day")),
    Number(getPart(stockholmParts, "hour")),
    Number(getPart(stockholmParts, "minute")),
    Number(getPart(stockholmParts, "second")),
  );

  return new Date(utcGuess.getTime() - (asUtc - utcGuess.getTime()));
}

function getPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) {
  const value = parts.find((part) => part.type === type)?.value;

  if (value === undefined) {
    throw new Error(`Missing ${type} in formatted date`);
  }

  return value;
}
