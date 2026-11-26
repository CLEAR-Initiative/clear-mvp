import React from "react";
import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

import { ClientOnly } from "./client-only";

/** Reads a browser-only value in render, like the map page reads its cookie. */
let browserValue = "server";
function BrowserSeeded() {
  return <p>{browserValue}</p>;
}

describe("ClientOnly", () => {
  // The /map page seeded its state from a cookie and sessionStorage, so the
  // hydrating render did not match the server markup and React threw #418
  // (dev GlitchTip clear-mvp issue 3949).
  it("hydrates the fallback, then renders the browser-seeded children", async () => {
    const { renderToString } = await import("react-dom/server");
    const { hydrateRoot } = await import("react-dom/client");
    const tree = (
      <div>
        <ClientOnly fallback={<span>loading</span>}>
          <BrowserSeeded />
        </ClientOnly>
      </div>
    );

    browserValue = "server";
    const container = document.createElement("div");
    container.innerHTML = renderToString(tree);
    document.body.appendChild(container);
    expect(container.textContent).toBe("loading");

    browserValue = "browser";
    const recoverable = vi.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, tree, { onRecoverableError: recoverable });
      });

      expect(recoverable).not.toHaveBeenCalled();
      expect(container.textContent).toBe("browser");
    } finally {
      act(() => root?.unmount());
      container.remove();
    }
  });

  it("renders the children at once on a client-only render", () => {
    browserValue = "browser";
    render(
      <ClientOnly fallback={<span>loading</span>}>
        <BrowserSeeded />
      </ClientOnly>,
    );
    expect(screen.getByText("browser")).toBeTruthy();
    expect(screen.queryByText("loading")).toBeNull();
  });
});
