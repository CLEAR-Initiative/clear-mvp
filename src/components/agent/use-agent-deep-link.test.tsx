import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../messages/en.json";
import { useAgentDeepLink, type AgentDeepLinkOptions } from "~/components/agent/use-agent-deep-link";
import { MAP_DEEP_LINK_PARAMS, MAP_ONE_SHOT_PARAMS, type LinkScope } from "~/lib/agent-deep-link";
import { markAgentDeepLink } from "~/lib/agent-navigation";

const show = vi.hoisted(() => vi.fn());
vi.mock("@mantine/notifications", () => ({ notifications: { show } }));

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={enMessages}>
    {children}
  </NextIntlClientProvider>
);

/** Put the page on `/map?query`, as the router would. */
function at(query: string) {
  search = query;
  window.history.replaceState(null, "", `/map${query ? `?${query}` : ""}`);
}

const sudan: LinkScope = { status: "honoured", country: "Sudan", region: { id: "loc-nd", name: "North Darfur" } };

function renderLink(scope: LinkScope) {
  const apply = vi.fn();
  const onGone = vi.fn();
  const hook = renderHook(
    ({ scope: s }: { scope: LinkScope }) => {
      const options: AgentDeepLinkOptions = {
        path: "/map",
        params: MAP_DEEP_LINK_PARAMS,
        oneShot: MAP_ONE_SHOT_PARAMS,
        scope: s,
        apply,
        onGone,
      };
      useAgentDeepLink(options);
    },
    { wrapper, initialProps: { scope } },
  );
  return { ...hook, apply, onGone };
}

beforeEach(() => {
  replace.mockClear();
  show.mockClear();
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  at("");
});

describe("useAgentDeepLink", () => {
  it("applies a link with one-shot filters as fresh, once, and takes them out of the URL in one replace", () => {
    at("countryId=loc-sdn&regionId=loc-nd&timeframe=7d");
    const { apply, rerender } = renderLink(sudan);
    expect(apply).toHaveBeenCalledExactlyOnceWith(true);
    expect(replace).toHaveBeenCalledExactlyOnceWith("/map?countryId=loc-sdn", { scroll: false });

    // The router lands on the rewritten URL: same link, nothing applied again.
    at("countryId=loc-sdn");
    rerender({ scope: { status: "honoured", country: "Sudan" } });
    expect(apply).toHaveBeenCalledOnce();
  });

  it("applies a country-only link as fresh when the Agent just made that move", () => {
    markAgentDeepLink("/map?countryId=loc-sdn");
    at("countryId=loc-sdn");
    const { apply } = renderLink({ status: "honoured", country: "Sudan" });
    expect(apply).toHaveBeenCalledExactlyOnceWith(true);
    expect(replace).not.toHaveBeenCalled();
  });

  it("treats the same URL again (Back, reload, details and back) as a revisit", () => {
    at("countryId=loc-sdn");
    const { apply } = renderLink({ status: "honoured", country: "Sudan" });
    expect(apply).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("applies a repeat move to the URL already on screen", () => {
    at("countryId=loc-sdn");
    const { apply } = renderLink({ status: "honoured", country: "Sudan" });
    act(() => markAgentDeepLink("/map?countryId=loc-sdn"));
    expect(apply.mock.calls).toEqual([[false], [true]]);
  });

  it("drops a link the page can't show, whole, with one word to the user, and applies nothing", () => {
    at("countryId=loc-sdn&regionId=loc-nd&timeframe=7d");
    const { apply, rerender } = renderLink({ status: "refused", country: "Sudan" });
    rerender({ scope: { status: "refused", country: "Sudan" } });
    expect(apply).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledOnce();
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Sudan isn't in your team's scope, so it isn't shown." }),
    );
    expect(replace).toHaveBeenCalledExactlyOnceWith("/map", { scroll: false });
  });

  it("says a place is unavailable when the page doesn't know it", () => {
    at("countryId=loc-nowhere");
    renderLink({ status: "refused" });
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ message: "That place isn't available to you, so it isn't shown." }),
    );
  });

  it("waits while the place is pending", () => {
    at("countryId=loc-sdn&timeframe=7d");
    const { apply } = renderLink({ status: "pending" });
    expect(apply).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("tells the page when the link's country leaves the URL", () => {
    at("countryId=loc-sdn");
    const { onGone, rerender } = renderLink({ status: "honoured", country: "Sudan" });
    expect(onGone).not.toHaveBeenCalled();
    at("");
    rerender({ scope: { status: "none" } });
    expect(onGone).toHaveBeenCalledOnce();
  });

  it("drops one-shot filters that come without a place", () => {
    at("timeframe=7d&event=ev-1");
    const { apply } = renderLink({ status: "none" });
    expect(apply).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledExactlyOnceWith("/map?event=ev-1", { scroll: false });
  });
});
