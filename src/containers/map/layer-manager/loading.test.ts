import { describe, expect, it } from "vitest";
import { loadingLayerIds } from "./loading";

const signals = { id: "signals", visibility: true, opacity: 1 } as const;

describe("loadingLayerIds", () => {
  it("counts an active layer that has not reported a status as loading", () => {
    expect(loadingLayerIds([signals], {})).toEqual(["signals"]);
  });

  it("drops a layer once it reports it is not loading", () => {
    expect(loadingLayerIds([signals], { signals: { loading: false, error: false } })).toEqual([]);
  });
});
