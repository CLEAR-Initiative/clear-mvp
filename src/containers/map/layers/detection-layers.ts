import type { DetectionKind } from "../selection";
import type { LayerId } from "./registry";

export const DETECTION_LAYER_IDS = {
  alert: "alerts",
  event: "events",
  signal: "signals",
} as const satisfies Record<DetectionKind, LayerId>;

const KIND_BY_LAYER_ID = new Map<LayerId, DetectionKind>(
  Object.entries(DETECTION_LAYER_IDS).map(([kind, id]) => [id, kind as DetectionKind]),
);

export function detectionKindOf(id: LayerId): DetectionKind | null {
  return KIND_BY_LAYER_ID.get(id) ?? null;
}
