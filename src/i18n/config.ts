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
