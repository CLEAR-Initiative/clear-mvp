export type LngLatPoint = [number, number];

/** What a click on the map picked. The map reports it; whoever embeds the map decides what it means. */
export type MapSelectTarget =
  | { type: "signal"; id: string }
  | { type: "signal-stack"; coordinates: LngLatPoint; signalIds: string[] };

/** What the embedding page tells the map is selected, so the map can highlight it. */
export type MapSelection = { type: "signal"; id: string } | { type: "signal-stack"; coordinates: LngLatPoint };
