"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  USER_TIMEZONE_COOKIE,
  detectBrowserTimeZone,
} from "@/lib/local-date";

/**
 * Sets the user IANA time zone cookie, then refreshes so the server
 * can compute "today" in the browser's local calendar.
 */
export function TodayTimezoneBootstrap() {
  const router = useRouter();
  const [message, setMessage] = useState("Detecting your local date…");

  useEffect(() => {
    const tz = detectBrowserTimeZone();
    document.cookie = `${USER_TIMEZONE_COOKIE}=${encodeURIComponent(
      tz
    )}; path=/; max-age=31536000; SameSite=Lax`;
    setMessage("Loading today’s agenda…");
    router.refresh();
  }, [router]);

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
      <p className="text-sm font-medium text-white">{message}</p>
      <p className="text-xs text-mute">
        Using your browser time zone so Today matches your local calendar.
      </p>
    </div>
  );
}
