import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

let pathname = "/map";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const { AgentPageOpenWatcher, trackAgentOpened } = await import("./agent-analytics");

const umamiTrack = vi.fn();

describe("Agent analytics", () => {
  afterEach(() => {
    delete window.umami;
    umamiTrack.mockReset();
    pathname = "/map";
  });

  it("sends the drawer open with a route pattern, not the URL", () => {
    window.umami = { track: umamiTrack, identify: vi.fn() };
    trackAgentOpened("drawer", "/event/cmvtdzfl0000fl307lu5gzbq3");
    expect(umamiTrack).toHaveBeenCalledWith("agent.opened", { surface: "drawer", from_route: "/event/:id" });
  });

  it("sends agent.opened {surface: page} on arriving at /agent, with the previous route", () => {
    window.umami = { track: umamiTrack, identify: vi.fn() };
    pathname = "/crisis/cmvtdzfl0000fl307lu5gzbq3";
    const { rerender } = render(<AgentPageOpenWatcher />);
    expect(umamiTrack).not.toHaveBeenCalled();
    pathname = "/agent";
    rerender(<AgentPageOpenWatcher />);
    expect(umamiTrack).toHaveBeenCalledWith("agent.opened", { surface: "page", from_route: "/crisis/:id" });
  });

  it("uses `direct` when the Agent page is the first page", () => {
    window.umami = { track: umamiTrack, identify: vi.fn() };
    pathname = "/agent";
    render(<AgentPageOpenWatcher />);
    expect(umamiTrack).toHaveBeenCalledWith("agent.opened", { surface: "page", from_route: "direct" });
  });
});
