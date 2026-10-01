import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import type enMessages from "../../messages/en.json";

import { defaultTimeZone, LOCALE_COOKIE, pickLocale, TIMEZONE_COOKIE } from "./config";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();

  const locale = pickLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    (await headers()).get("accept-language"),
  );

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
  // when one is missing.
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
