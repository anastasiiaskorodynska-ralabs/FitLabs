import "server-only";
import { cookies } from "next/headers";
import { TZ_COOKIE } from "@/lib/tz-cookie";

// Today's date (YYYY-MM-DD) in the device timezone reported by <TimezoneSync>.
export async function todayIso() {
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz || "UTC" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export async function currentTimezone() {
  return (await cookies()).get(TZ_COOKIE)?.value;
}
