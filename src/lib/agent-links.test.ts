import { describe, expect, it } from "vitest";
import { AGENT_LINK_GUIDE, agentLink } from "~/lib/agent-links";

describe("agentLink", () => {
  it.each(["/event/ev_1", "/signal/abc-123", "/crisis/cr1"])("opens the entity page %s", (href) =>
    expect(agentLink(href)).toEqual({ kind: "entity", href }),
  );

  it.each(["/dashboard", "/map", "/detection", "/inbox", "/knowledge"])("opens the section %s", (href) =>
    expect(agentLink(href)).toEqual({ kind: "section", href }),
  );

  it("opens the Map and Detection with the filters their pages read", () => {
    expect(agentLink("/map?countryId=loc1&regionId=loc2&timeframe=7d")).toEqual({
      kind: "filtered",
      href: "/map?countryId=loc1&regionId=loc2&timeframe=7d",
    });
    expect(agentLink("/detection?countryId=loc1&date=Last%207%20days&severities=critical,high")).toEqual({
      kind: "filtered",
      href: "/detection?countryId=loc1&date=Last+7+days&severities=critical%2Chigh",
    });
  });

  it("drops parameters the page doesn't read", () => {
    expect(agentLink("/map?countryId=loc1&next=//evil.test")).toEqual({ kind: "filtered", href: "/map?countryId=loc1" });
    expect(agentLink("/map?timeframe=forever")).toEqual({ kind: "section", href: "/map" });
    expect(agentLink("/inbox?x=1")).toEqual({ kind: "section", href: "/inbox" });
  });

  it.each([
    "//evil.test",
    "/\\evil.test",
    "https://evil.test/event/ev1",
    "javascript:alert(1)",
    "/admin",
    "/settings/org",
    "/event/ev1/edit",
    "/event/ev1#x",
    "/event/",
    "event/ev1",
    "",
    undefined,
  ])("refuses %s", (href) => expect(agentLink(href)).toBeNull());
});

describe("AGENT_LINK_GUIDE", () => {
  it("only teaches links the Thread will open", () => {
    for (const path of ["/event/<id>", "/signal/<id>", "/crisis/<id>"]) {
      expect(AGENT_LINK_GUIDE).toContain(path);
      expect(agentLink(path.replace("<id>", "x1"))).not.toBeNull();
    }
    for (const section of AGENT_LINK_GUIDE.split("\n").at(-1)!.match(/`(\/[a-z]+)`/g)!) {
      expect(agentLink(section.replaceAll("`", ""))?.kind).toBe("section");
    }
  });
});
