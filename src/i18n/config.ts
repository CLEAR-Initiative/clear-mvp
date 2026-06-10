export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const LOCALE_COOKIE = "NEXT_LOCALE";
export const TIMEZONE_COOKIE = "CLEAR_TZ";

export const defaultTimeZone = "Africa/Khartoum";

/**
 * Text direction per locale. Adding an RTL language later (e.g. Arabic)
 * only requires a new entry here plus its messages/<locale>.json file.
 */
export const localeDirection: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  fr: "ltr",
};

export const localeLabels: Record<Locale, string> = {
  en: "English",
  fr: "Français",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
