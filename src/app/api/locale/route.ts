import { NextResponse } from "next/server";

import {
  isLocale,
  LOCALE_COOKIE,
  TIMEZONE_COOKIE,
} from "~/i18n/config";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Sets the locale (and optionally timezone) cookies that drive
 * src/i18n/request.ts. This is the single seam for locale changes;
 * when backend persistence of the preference lands, it hooks in here.
 */
export async function POST(request: Request) {
  let body: { locale?: unknown; timezone?: unknown };
  try {
    body = (await request.json()) as { locale?: unknown; timezone?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isLocale(body.locale)) {
    return NextResponse.json({ error: "Unsupported locale" }, { status: 400 });
  }

  if (
    body.timezone !== undefined &&
    (typeof body.timezone !== "string" || !isValidTimeZone(body.timezone))
  ) {
    return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  const cookieOptions = {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
  } as const;

  res.cookies.set(LOCALE_COOKIE, body.locale, cookieOptions);
  if (typeof body.timezone === "string") {
    res.cookies.set(TIMEZONE_COOKIE, body.timezone, cookieOptions);
  }

  return res;
}
