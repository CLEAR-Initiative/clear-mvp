import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";

/**
 * The route error screen: reports to Sentry, says "updated" and reloads once
 * for a stale chunk, and offers Try again only for errors a re-render can fix.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    values ? `${key}:${Object.values(values).join(",")}` : key,
}));

const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));

import { RouteErrorView } from "./route-error-view";
import { CHUNK_RELOAD_KEY } from "~/lib/chunk-load-error";

const reload = vi.fn();

function renderView(error: Error & { digest?: string }, reset = vi.fn()) {
  render(
    <MantineProvider>
      <RouteErrorView error={error} reset={reset} />
    </MantineProvider>,
  );
  return reset;
}

function chunkError() {
  return Object.assign(new Error("Loading chunk 8113 failed."), { name: "ChunkLoadError" });
}

beforeEach(() => {
  window.sessionStorage.clear();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, reload },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RouteErrorView", () => {
  it("shows a recoverable error, reports it, and lets the user try again", () => {
    const reset = renderView(Object.assign(new Error("boom"), { digest: "abc123" }));

    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("reference:abc123")).toBeInTheDocument();
    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "boom" }),
      { tags: { boundary: "route", chunk_load: "false" } },
    );
    expect(reload).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "tryAgain" }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("reloads once for a stale chunk and says the app was updated", () => {
    renderView(chunkError());

    expect(screen.getByText("updatedTitle")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "tryAgain" })).toBeNull();
    expect(reload).toHaveBeenCalledOnce();
    expect(window.sessionStorage.getItem(CHUNK_RELOAD_KEY)).not.toBeNull();
  });

  it("stays on the error screen if it already reloaded a moment ago", () => {
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    renderView(chunkError());

    expect(reload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "reload" }));
    expect(reload).toHaveBeenCalledOnce();
  });
});
