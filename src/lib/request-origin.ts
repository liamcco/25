import { headers } from "next/headers";

export async function getRequestOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");

  if (!host) {
    throw new Error("Unable to determine request host");
  }

  const proto = headerStore.get("x-forwarded-proto") ?? "http";

  return `${proto}://${host}`;
}
