"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { timeZoneOptions, type TimeZoneOption } from "./timezones";

/** Timezone select options: Khartoum and UTC first, then every IANA zone. */
export function useTimeZoneOptions(current?: string): TimeZoneOption[] {
  const t = useTranslations("profile.edit");
  const khartoum = t("timezoneKhartoum");
  const utc = t("timezoneUtc");
  return useMemo(
    () =>
      timeZoneOptions({
        pinned: [
          { value: "Africa/Khartoum", label: khartoum },
          { value: "UTC", label: utc },
        ],
        current,
      }),
    [khartoum, utc, current],
  );
}
