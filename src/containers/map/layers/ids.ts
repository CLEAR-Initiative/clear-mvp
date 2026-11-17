export const LAYER_IDS = ["signals"] as const;

export type LayerId = (typeof LAYER_IDS)[number];

export function isLayerId(id: string): id is LayerId {
  return (LAYER_IDS as readonly string[]).includes(id);
}
