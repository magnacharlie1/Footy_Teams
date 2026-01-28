import { cookies } from "next/headers";

export async function isDevAuthBypassEnabled() {
  const enabled =
    process.env.DEV_AUTH_BYPASS === "true" &&
    process.env.NODE_ENV !== "production";
  if (!enabled) return false;
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get("dev_auth_bypass")?.value;
  return cookieValue !== "off";
}
