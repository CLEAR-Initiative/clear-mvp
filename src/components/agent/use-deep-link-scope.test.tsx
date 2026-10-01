import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../messages/en.json";
import { useDeepLinkCountryScope } from "~/components/agent/use-deep-link-scope";

const show = vi.hoisted(() => vi.fn());
vi.mock("@mantine/notifications", () => ({ notifications: { show } }));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={enMessages}>
    {children}
  </NextIntlClientProvider>
);

describe("useDeepLinkCountryScope", () => {
  it("drops a deep-linked country the page can't show, and says so", () => {
    const drop = vi.fn();
    renderHook(
      () => useDeepLinkCountryScope({ linkCountry: "Chad", selectedCountry: "Sudan", scopeReady: true, drop }),
      { wrapper },
    );
    expect(drop).toHaveBeenCalledOnce();
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Chad isn't in your team's scope, so it isn't shown." }),
    );
  });

  it("leaves an honoured link, and waits for the team scope", () => {
    const drop = vi.fn();
    renderHook(
      () => useDeepLinkCountryScope({ linkCountry: "Chad", selectedCountry: "Chad", scopeReady: true, drop }),
      { wrapper },
    );
    renderHook(
      () => useDeepLinkCountryScope({ linkCountry: "Chad", selectedCountry: "Sudan", scopeReady: false, drop }),
      { wrapper },
    );
    expect(drop).not.toHaveBeenCalled();
  });
});
