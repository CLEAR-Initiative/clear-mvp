import React from "react";
import { describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";

/**
 * The flags are fetched only in the browser, so the server renders every
 * flag consumer with the defaults. If the flags land before a page's
 * Suspense boundary hydrates, a consumer that branched on them during
 * hydration rendered markup the server never sent and React threw #418.
 * The hooks must hand the server view to a component until it has hydrated.
 */

let flagsLoaded = false;
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({ featureFlags: { getAll: {} } }),
    featureFlags: {
      getAll: {
        useQuery: () =>
          flagsLoaded
            ? { data: [{ key: "agent", enabled: true }], isLoading: false }
            : { data: undefined, isLoading: true },
      },
      toggle: { useMutation: () => ({ mutate: vi.fn() }) },
    },
  },
}));

const { FeatureFlagsProvider, useFeatureEnabled, useFeatureFlags } = await import("./feature-flags-provider");

function AgentPageStub() {
  const agentOn = useFeatureEnabled("agent"); // defaults to off
  const { isLoading } = useFeatureFlags();
  if (isLoading) return <p>loading</p>;
  return agentOn ? <section>agent thread</section> : <p>agent unavailable</p>;
}

describe("feature flag hooks during hydration", () => {
  it("hydrate the server markup even when the flags arrived first", async () => {
    const { renderToString } = await import("react-dom/server");
    const { hydrateRoot } = await import("react-dom/client");
    const tree = (
      <FeatureFlagsProvider>
        <AgentPageStub />
      </FeatureFlagsProvider>
    );

    flagsLoaded = false;
    const container = document.createElement("div");
    container.innerHTML = renderToString(tree);
    document.body.appendChild(container);
    expect(container.textContent).toBe("loading");

    flagsLoaded = true;
    const recoverable = vi.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, tree, { onRecoverableError: recoverable });
      });

      expect(recoverable).not.toHaveBeenCalled();
      // One render after hydration the consumer catches up with the flags.
      expect(container.textContent).toBe("agent thread");
    } finally {
      act(() => root?.unmount());
      container.remove();
      flagsLoaded = false;
    }
  });
});
