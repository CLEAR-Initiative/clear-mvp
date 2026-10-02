import { afterEach, describe, expect, it } from "vitest";
import { isNavigateResult, markAgentDeepLink, sameHref, takeAgentDeepLink } from "~/lib/agent-navigation";

const result = (url: string) => ({ moved: true, target: { kind: "map" }, url, content: { label: "x" } });

afterEach(() => sessionStorage.clear());

describe("isNavigateResult", () => {
  it.each(["/event/ev-1", "/signal/s_2", "/map", "/map?countryId=loc-sdn", "/detection?date=Last+7+days"])(
    "accepts %s",
    (url) => expect(isNavigateResult(result(url))).toBe(true),
  );

  it.each([
    "//evil.example",
    "/\\evil.example",
    "/admin/users",
    "/event/../admin",
    "/crisis/c%2F..%2Fadmin",
    "javascript:alert(1)",
    "/map#x",
    "event/ev-1",
  ])("rejects %s", (url) => expect(isNavigateResult(result(url))).toBe(false));

  it("rejects a result without its label under content", () => {
    expect(isNavigateResult({ moved: true, target: { kind: "map" }, url: "/map", label: "x" })).toBe(false);
  });
});

describe("fresh Agent moves", () => {
  it("compares hrefs by path and parameters, in any order", () => {
    expect(sameHref("/map?countryId=a&timeframe=7d", "/map?timeframe=7d&countryId=a")).toBe(true);
    expect(sameHref("/map?countryId=a", "/detection?countryId=a")).toBe(false);
    expect(sameHref("/map?countryId=a", "/map?countryId=b")).toBe(false);
  });

  it("takes a marked move once, for its own URL only", () => {
    markAgentDeepLink("/map?countryId=loc-sdn");
    expect(takeAgentDeepLink("/map?countryId=loc-tcd")).toBe(false);
    expect(takeAgentDeepLink("/map?countryId=loc-sdn")).toBe(true);
    expect(takeAgentDeepLink("/map?countryId=loc-sdn")).toBe(false);
  });
});
