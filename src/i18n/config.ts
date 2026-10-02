// UI locales. Keep aligned with clear-api/src/utils/locales.ts →
// SUPPORTED_LOCALES when adding content-translation targets. All four are
// now content-translation targets too — the sidecar produces es alongside
// fr/ar (`es` added for analyst UI in #440, then wired for content).
export const locales = ["en", "fr", "es", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const LOCALE_COOKIE = "NEXT_LOCALE";
export const TIMEZONE_COOKIE = "CLEAR_TZ";

export const defaultTimeZone = "Africa/Khartoum";

export const localeDirection: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  fr: "ltr",
  es: "ltr",
  ar: "rtl",
};

export const localeLabels: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  ar: "العربية",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/**
 * Picks the first supported locale from an Accept-Language header value,
 * e.g. "fr-FR,fr;q=0.9,en;q=0.8" -> "fr". Tokens arrive in client
 * preference order, so the first match wins.
 */
export function matchAcceptLanguage(header: string | null | undefined): Locale | undefined {
  if (!header) return undefined;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase();
    if (!tag) continue;
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return undefined;
}

/** The UI locale for a request: the locale cookie, else Accept-Language. */
export function pickLocale(cookieLocale: string | undefined, acceptLanguage: string | null | undefined): Locale {
  return isLocale(cookieLocale) ? cookieLocale : (matchAcceptLanguage(acceptLanguage) ?? defaultLocale);
}
