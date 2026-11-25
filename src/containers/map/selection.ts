export type LngLatPoint = [number, number];

/** The kinds of detection the map can draw, each in its own layer; a selection says which kind it is. */
export const DETECTION_KINDS = ["signal", "event", "alert"] as const;

export type DetectionKind = (typeof DETECTION_KINDS)[number];

export function isDetectionKind(value: unknown): value is DetectionKind {
  return (DETECTION_KINDS as readonly unknown[]).includes(value);
}

/** What a click on the map picked. The map reports it; whoever embeds the map decides what it means. */
export type MapSelectTarget =
  | { type: "detection"; kind: DetectionKind; id: string }
  | { type: "stack"; kind: DetectionKind; coordinates: LngLatPoint; ids: string[] };

/** What the embedding page tells the map is selected, so the map can highlight it. */
export type MapSelection =
  | { type: "detection"; kind: DetectionKind; id: string }
  | { type: "stack"; kind: DetectionKind; coordinates: LngLatPoint };
