"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { api } from "~/trpc/react";
import { isLocale } from "~/i18n/config";

/**
 * Seeds the locale cookie from the user's persisted language preference
 * (clear-api user.language) after login or on a new device.
 *
 * Evaluates exactly once, when the preference first arrives: explicit
 * language switches elsewhere write both the cookie and the profile, so
 * re-evaluating here could race a stale cache and flip the locale back.
 */
export function LocaleSync() {
  const locale = useLocale();
  const router = useRouter();
  const { data } = api.auth.myUserDetails.useQuery(undefined, {
    staleTime: 5 * 60_000,
    retry: false,
  });
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    const pref = data?.language;
    if (pref === undefined) return; // wait for the first fetch
    checked.current = true;
    if (isLocale(pref) && pref !== locale) {
      void fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: pref }),
      }).then(() => router.refresh());
    }
  }, [data?.language, locale, router]);

  return null;
}
