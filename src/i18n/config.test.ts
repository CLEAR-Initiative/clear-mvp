import { describe, expect, it } from "vitest";

import {
  isLocale,
  localeDirection,
  localeLabels,
  locales,
} from "./config";

describe("i18n locales", () => {
  it("includes Spanish as a first-class LTR locale", () => {
    expect(locales).toContain("es");
    expect(isLocale("es")).toBe(true);
    expect(localeDirection.es).toBe("ltr");
    expect(localeLabels.es).toBe("Español");
  });

  it("rejects unknown locale codes", () => {
    expect(isLocale("de")).toBe(false);
    expect(isLocale("es-VE")).toBe(false);
  });
});
