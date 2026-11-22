import { reportHandledError } from "~/lib/report-handled-error";

/**
 * `setPaintProperty` with one rule checked first: a paint value that reads
 * feature state must keep reading feature state.
 *
 * Why: Mapbox builds a paint array per tile for a value that reads feature
 * state. When that value is swapped for a constant, tiles already on screen
 * keep the old array until they reload. A feature-state update in that gap
 * makes Mapbox call `.evaluate()` on the constant, and the render loop throws
 * "this.expression.evaluate is not a function" (GlitchTip prod #912). It is a
 * timing race, so neither a mocked unit test nor one E2E run sees it. This
 * rule bans the pattern instead.
 *
 * To hide a layer whose paint reads feature state, set its `visibility`, or
 * keep the expression and make its branches return the hidden value.
 *
 * Use this for every runtime paint change in the old map; ESLint bans direct
 * `setPaintProperty` calls under `src/components/map` and `src/lib/map`.
 */

/** The part of a Mapbox map this helper needs. */
export interface PaintMap {
  setPaintProperty: (layerId: string, name: string, value: never) => unknown;
  /** Optional: without it the rule cannot be checked and the value is set. */
  getPaintProperty?: (layerId: string, name: string) => unknown;
}

/** True when a style value is an expression that reads `feature-state`. */
export function readsFeatureState(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  if (value[0] === "feature-state") return true;
  return value.some(readsFeatureState);
}

/** Why changing a paint value from `current` to `next` is unsafe, or null. */
export function paintChangeProblem(current: unknown, next: unknown): string | null {
  if (!readsFeatureState(current) || readsFeatureState(next)) return null;
  return (
    "the current value reads feature-state and the new value does not. " +
    "Mapbox can throw \"this.expression.evaluate is not a function\" on the next feature-state update. " +
    "Hide the layer with `visibility`, or keep a feature-state expression"
  );
}

export class UnsafePaintChangeError extends Error {
  constructor(layerId: string, name: string, problem: string) {
    super(`Unsafe paint change on layer "${layerId}", property "${name}": ${problem}.`);
    this.name = "UnsafePaintChangeError";
  }
}

/**
 * Set a paint property after checking the rule above. An unsafe change is
 * always reported. Outside production it also throws, so tests and local
 * runs fail at the call. In production the value is still set: the report
 * is the signal, and the old behaviour is no worse than before.
 */
export function setPaintPropertySafe(map: PaintMap, layerId: string, name: string, value: unknown): void {
  const problem = map.getPaintProperty ? paintChangeProblem(map.getPaintProperty(layerId, name), value) : null;
  if (problem) {
    const error = new UnsafePaintChangeError(layerId, name, problem);
    // Many call sites sit inside `try { … } catch {}`, which would swallow
    // the throw. Report first so the failure is never silent.
    console.error(error.message);
    reportHandledError(error, { feature: "map", stage: "paint-guard", extra: { layerId, name } });
    if (process.env.NODE_ENV !== "production") throw error;
  }
  // The one direct call the lint rule allows.
  // eslint-disable-next-line no-restricted-syntax
  map.setPaintProperty(layerId, name, value as never);
}
