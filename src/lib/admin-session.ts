import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  createSql,
  verifyAdminSession,
} from "@/lib/admin";

export async function getCurrentAdminSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  return verifyAdminSession(createSql(), sessionToken);
}
