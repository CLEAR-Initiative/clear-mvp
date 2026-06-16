// Keep in sync with clear-api/src/utils/locales.ts → SUPPORTED_LOCALES.
// fa (Dari) and ps (Pashto) are wired up for the Afghanistan launch.
// Their UI message catalogs are not yet shipped — next-intl falls back
// to the English catalog when one is missing (see i18n/request.ts), so
// the UI chrome stays in English while backend-translated content
// (crisis titles, event descriptions) still appears in the selected
// locale. Once the catalogs land, no other config change is needed.
export const locales = ["en", "fr", "ar", "fa", "ps"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const LOCALE_COOKIE = "NEXT_LOCALE";
export const TIMEZONE_COOKIE = "CLEAR_TZ";

export const defaultTimeZone = "Africa/Khartoum";

export const localeDirection: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  fr: "ltr",
  ar: "rtl",
  fa: "rtl",
  ps: "rtl",
};

export const localeLabels: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  ar: "العربية",
  fa: "دری",
  ps: "پښتو",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
