// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  COMMENT_MARKER,
  classKey,
  decideOutcome,
  groupClasses,
  nextPageUrl,
  renderReport,
  selectIssues,
} from "./dev-errors-report.mjs";

const issue = (over) => ({
  id: "1",
  title: "TypeError: this.expression.evaluate is not a function",
  count: "1",
  status: "unresolved",
  firstSeen: "2026-11-10T09:00:00Z",
  lastSeen: "2026-11-12T09:00:00Z",
  ...over,
});

describe("classKey", () => {
  it("puts the Safari and Chrome wording of one error in one class", () => {
    const chrome = "TypeError: this.expression.evaluate is not a function";
    const safari = "TypeError: this.expression.evaluate is not a function. (In 'this.expression.evaluate({zoom:this.con…";
    expect(classKey(safari)).toBe(classKey(chrome));
  });

  it("puts every React #418 variant in one class", () => {
    const html = "Error: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the fu…";
    const text = "Error: Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the fu…";
    expect(classKey(html)).toBe(classKey(text));
  });

  it("keeps different React error codes apart", () => {
    const title = (code) => `Error: Minified React error #${code}; visit https://react.dev/errors/${code}?args[]=HTML&args[]= for the fu…`;
    expect(classKey(title(418))).toBe("Minified React error #418");
    expect(classKey(title(423))).not.toBe(classKey(title(418)));
  });

  it("keeps different errors apart", () => {
    expect(classKey("TypeError: a is undefined")).not.toBe(classKey("TypeError: b is undefined"));
  });
});

describe("selectIssues", () => {
  const since = "2026-11-11T00:00:00Z";

  it("keeps unresolved issues seen at or after `since`", () => {
    const kept = selectIssues(
      [
        issue({ id: "seen-after" }),
        issue({ id: "seen-before", lastSeen: "2026-11-10T23:00:00Z" }),
        issue({ id: "resolved", status: "resolved" }),
      ],
      { since },
    );
    expect(kept.map((i) => i.id)).toEqual(["seen-after"]);
  });

  it("drops issues first seen after `until`", () => {
    const kept = selectIssues([issue({ id: "old" }), issue({ id: "new", firstSeen: "2026-11-20T00:00:00Z", lastSeen: "2026-11-21T00:00:00Z" })], {
      since,
      until: "2026-11-13T00:00:00Z",
    });
    expect(kept.map((i) => i.id)).toEqual(["old"]);
  });
});

describe("groupClasses", () => {
  it("sums events per class and sorts the largest first", () => {
    const classes = groupClasses([
      issue({ id: "a", count: "2" }),
      issue({ id: "b", count: "3", firstSeen: "2026-11-09T00:00:00Z", lastSeen: "2026-11-14T00:00:00Z" }),
      issue({ id: "c", title: "Error: other", count: "9" }),
    ]);
    expect(classes.map((c) => [c.key, c.events, c.issues.length])).toEqual([
      ["Error: other", 9, 1],
      ["TypeError: this.expression.evaluate is not a function", 5, 2],
    ]);
    expect(classes[1].firstSeen).toBe("2026-11-09T00:00:00Z");
    expect(classes[1].lastSeen).toBe("2026-11-14T00:00:00Z");
  });
});

describe("nextPageUrl", () => {
  it("returns the next URL only when it has results", () => {
    const link = (results) =>
      `<https://g/api/0/x?cursor=p>; rel="previous"; results="false", <https://g/api/0/x?cursor=n>; rel="next"; results="${results}"`;
    expect(nextPageUrl(link("true"))).toBe("https://g/api/0/x?cursor=n");
    expect(nextPageUrl(link("false"))).toBeNull();
    expect(nextPageUrl(null)).toBeNull();
  });
});

describe("decideOutcome", () => {
  it("blocks a dev sync with errors until a person has reviewed them", () => {
    expect(decideOutcome(2, { mode: "sync", reviewed: false })).toBe("blocked");
    expect(decideOutcome(2, { mode: "sync", reviewed: true })).toBe("reviewed");
  });

  it("never blocks a hotfix or a clean sync", () => {
    expect(decideOutcome(2, { mode: "report", reviewed: false })).toBe("report");
    expect(decideOutcome(0, { mode: "sync", reviewed: false })).toBe("clean");
  });
});

describe("renderReport", () => {
  const opts = { since: "2026-11-11T00:00:00Z", baseUrl: "https://g", org: "clear" };

  it("says so when dev is clean", () => {
    const report = renderReport([], { ...opts, outcome: "clean" });
    expect(report).toContain(COMMENT_MARKER);
    expect(report).toContain("No unresolved errors on dev since 2026-11-11.");
  });

  it("lists each class with links and tells the reader how to unblock", () => {
    const classes = groupClasses([issue({ id: "42", count: "9", title: "TypeError: a | b" })]);
    const report = renderReport(classes, { ...opts, outcome: "blocked" });
    expect(report).toContain("| 9 | 2026-11-10 | 2026-11-12 | TypeError: a \\| b | [#42](https://g/clear/issues/42) |");
    expect(report).toContain("`dev-errors-reviewed`");
  });
});
