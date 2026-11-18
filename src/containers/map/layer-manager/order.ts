export function markerId(id: string): string {
  return `map-v2-marker-${id}`;
}

export function slotBeforeIds(ids: readonly string[], labelAnchorId: string | undefined): (string | undefined)[] {
  return ids.map((_, i) => (i === 0 ? labelAnchorId : markerId(ids[i - 1]!)));
}
