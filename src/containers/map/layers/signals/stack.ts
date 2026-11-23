import type { GqlSignal } from "~/lib/types/graphql";
import { isSamePoint, type LngLatPoint } from "../../selection";
import { signalPoint } from "./to-features";

type SignalLocations = Pick<GqlSignal, "generalLocation" | "originLocation" | "destinationLocation">;

/** The signals drawn at `point`: the members of a stack of signals. */
export function signalsAtPoint<T extends SignalLocations>(signals: T[], point: LngLatPoint): T[] {
  return signals.filter((signal) => {
    const coordinates = signalPoint(signal);
    return coordinates !== null && isSamePoint(coordinates, point);
  });
}
