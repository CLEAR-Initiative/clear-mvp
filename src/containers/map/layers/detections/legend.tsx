"use client";

import { SegmentedControl } from "@mantine/core";
import { useTranslations } from "next-intl";
import type { LegendProps } from "../types";
import { donutBand, donutGradient, type SeverityCounts } from "./donut";
import { DENSITY_DISPLAYS, parseSignalsSettings, signalsSettingsFor, type DensityDisplay } from "./settings";
import { SEVERITY_BUCKETS, SEVERITY_TOKENS } from "./severity-tokens";
import classes from "./legend.module.css";

const DENSITY_DONUT_SIZES = [20, 22, 24, 26, 28];
const SAMPLE_MIX: SeverityCounts = { critical: 1, high: 3, medium: 2, low: 1, unknown: 1 };

function donutRingStyle(size: number): React.CSSProperties {
  return { background: donutGradient(SAMPLE_MIX), "--ring-band": `${donutBand(size)}px` } as React.CSSProperties;
}

function isDensityDisplay(value: string): value is DensityDisplay {
  return (DENSITY_DISPLAYS as readonly string[]).includes(value);
}

export function DetectionsLegend({ id, settings, onSettingsChange }: LegendProps) {
  const t = useTranslations();
  const { density } = parseSignalsSettings(settings);

  return (
    <div className={classes.root}>
      <div className={classes.density}>
        <h3 className={classes.heading}>{t("mapV2.detectionLegend.density")}</h3>
        <div className={classes.showing}>
          <span>{t("mapV2.detectionLegend.showing")}</span>
          <SegmentedControl
            aria-label={t("mapV2.detectionLegend.densityDisplay")}
            value={density}
            onChange={(value) => {
              if (isDensityDisplay(value)) onSettingsChange(signalsSettingsFor(value));
            }}
            data={DENSITY_DISPLAYS.map((value) => ({ value, label: t(`mapV2.detectionLegend.${value}`) }))}
            withItemsBorders={false}
            classNames={{
              root: classes.switch,
              control: classes.switchControl,
              label: classes.switchLabel,
              indicator: classes.switchIndicator,
            }}
          />
        </div>
        <div className={classes.scales}>
          <div className={classes.scale} aria-hidden={density !== "clusters"}>
            <span>{t(`mapV2.layers.${id}.fewer`)}</span>
            {DENSITY_DONUT_SIZES.map((size) => (
              <span key={size} className={classes.donut} style={{ width: size, height: size }}>
                <span className="map-v2-cluster-ring" style={donutRingStyle(size)} />
              </span>
            ))}
            <span>{t(`mapV2.layers.${id}.more`)}</span>
          </div>
          <div aria-hidden={density !== "heatmap"}>
            <div className={classes.heat} />
            <div className={classes.ends}>
              <span>{t("mapV2.detectionLegend.low")}</span>
              <span>{t("mapV2.detectionLegend.high")}</span>
            </div>
          </div>
        </div>
      </div>
      <h3 className={classes.heading}>{t("mapV2.detectionLegend.severity")}</h3>
      <div>
        <div className={classes.bar}>
          {SEVERITY_BUCKETS.map((bucket) => (
            <span key={bucket} style={{ background: `var(${SEVERITY_TOKENS[bucket]})` }} />
          ))}
        </div>
        <div className={classes.labels}>
          {SEVERITY_BUCKETS.map((bucket) => (
            <span key={bucket}>{t(`common.severities.${bucket}`)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
