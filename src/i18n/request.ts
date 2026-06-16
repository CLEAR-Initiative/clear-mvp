import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import type enMessages from "../../messages/en.json";

import {
  defaultLocale,
  defaultTimeZone,
  isLocale,
  LOCALE_COOKIE,
  TIMEZONE_COOKIE,
  type Locale,
} from "./config";

/**
 * Picks the first supported locale from an Accept-Language header value,
 * e.g. "fr-FR,fr;q=0.9,en;q=0.8" -> "fr". Tokens arrive in client
 * preference order, so the first match wins.
 */
function matchAcceptLanguage(header: string | null): Locale | undefined {
  if (!header) return undefined;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase();
    if (!tag) continue;
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return undefined;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();

  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : (matchAcceptLanguage((await headers()).get("accept-language")) ??
      defaultLocale);

  // Cookie values are URL-encoded on write ("Africa%2FKhartoum"); decode
  // defensively since RequestCookies does not always decode on read.
  const rawTimeZone = cookieStore.get(TIMEZONE_COOKIE)?.value;
  let timeZone = defaultTimeZone;
  if (rawTimeZone) {
    try {
      timeZone = decodeURIComponent(rawTimeZone);
    } catch {
      timeZone = rawTimeZone;
    }
    try {
      new Intl.DateTimeFormat("en", { timeZone });
    } catch {
      timeZone = defaultTimeZone;
    }
  }

  // Load the catalog for the active locale, falling back to English
  // when one is missing. New locales (fa/ps for the AFG launch) can
  // be added to `locales` in config.ts before their catalogs ship —
  // the UI chrome stays English in the meantime while backend-
  // translated content (crisis titles, event descriptions) still
  // appears in the user's chosen locale.
  let messages: typeof enMessages;
  try {
    messages = (
      (await import(`../../messages/${locale}.json`)) as {
        default: typeof enMessages;
      }
    ).default;
  } catch {
    messages = (await import("../../messages/en.json")).default;
  }

  return {
    locale,
    timeZone,
    messages,
    formats: {
      dateTime: {
        short: { day: "numeric", month: "short", year: "numeric" },
        long: { day: "numeric", month: "long", year: "numeric" },
        time: { hour: "numeric", minute: "numeric" },
        dateTime: {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
        },
      },
      number: {
        compact: { notation: "compact", maximumFractionDigits: 1 },
        integer: { maximumFractionDigits: 0 },
      },
    },
  };
});
