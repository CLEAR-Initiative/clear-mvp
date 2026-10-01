import { describe, expect, it } from "vitest";
import { isNavigateResult } from "~/lib/agent-navigation";

const result = (url: string) => ({ moved: true, target: { kind: "map" }, url, content: { label: "x" } });

describe("isNavigateResult", () => {
  it.each(["/event/ev-1", "/signal/s_2", "/crisis/c%201", "/map", "/map?country=Sudan", "/detection?date=Last+7+days"])(
    "accepts %s",
    (url) => expect(isNavigateResult(result(url))).toBe(true),
  );

  it.each(["//evil.example", "/\\evil.example", "/admin/users", "/event/../admin", "javascript:alert(1)", "/map#x", "event/ev-1"])(
    "rejects %s",
    (url) => expect(isNavigateResult(result(url))).toBe(false),
  );
});
