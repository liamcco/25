import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  createSql,
  verifyAdminSession,
} from "@/lib/admin";
import { ensurePersistenceBootstrapped } from "@/lib/db/bootstrap";

export async function getCurrentAdminSession() {
  await ensurePersistenceBootstrapped();

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  return verifyAdminSession(createSql(), sessionToken);
}
