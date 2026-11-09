import { describe, expect, it } from "vitest";
import { locales } from "~/i18n/config";
import { globalErrorCopy } from "./global-error-copy";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import es from "../../messages/es.json";
import ar from "../../messages/ar.json";

const catalogs = { en, fr, es, ar };

describe("globalErrorCopy", () => {
  it.each(locales)("matches errorBoundary in messages/%s.json", (locale) => {
    const fromCatalog = catalogs[locale].errorBoundary;
    const copy = globalErrorCopy[locale];
    for (const key of Object.keys(copy) as (keyof typeof copy)[]) {
      expect(copy[key], `${locale}.${key}`).toBe(fromCatalog[key]);
    }
  });
});
