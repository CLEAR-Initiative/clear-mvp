import { z } from "zod";
import type { LayerSettings } from "../../hooks/use-active-layers";

export const DENSITY_DISPLAYS = ["clusters", "heatmap"] as const;

export type DensityDisplay = (typeof DENSITY_DISPLAYS)[number];

export type SignalsSettings = { density: DensityDisplay };

const DEFAULT_SETTINGS: SignalsSettings = { density: "clusters" };

const signalsSettingsSchema = z
  .object({ density: z.enum(DENSITY_DISPLAYS).catch(DEFAULT_SETTINGS.density) })
  .catch(DEFAULT_SETTINGS);

export function parseSignalsSettings(settings: LayerSettings | undefined): SignalsSettings {
  return signalsSettingsSchema.parse(settings ?? {});
}

export function signalsSettingsFor(density: DensityDisplay): LayerSettings | undefined {
  return density === DEFAULT_SETTINGS.density ? undefined : { density };
}
