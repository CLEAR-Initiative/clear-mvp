"use client";

import { SegmentedControl } from "@mantine/core";
import { useTranslations } from "next-intl";
import type { LegendProps } from "../types";
import { DENSITY_DISPLAYS, parseSignalsSettings, signalsSettingsFor, type DensityDisplay } from "./settings";
import { SEVERITY_BUCKETS, SEVERITY_TOKENS } from "./severity-tokens";
import classes from "./legend.module.css";

const DENSITY_DOT_SIZES = Array.from({ length: 15 }, (_, i) => i + 3);

function isDensityDisplay(value: string): value is DensityDisplay {
  return (DENSITY_DISPLAYS as readonly string[]).includes(value);
}

export function SignalsLegend({ settings, onSettingsChange }: LegendProps) {
  const t = useTranslations();
  const { density } = parseSignalsSettings(settings);

  return (
    <div className={classes.root}>
      <div className={classes.density}>
        <h3 className={classes.heading}>{t("mapV2.layers.signals.density")}</h3>
        <div className={classes.showing}>
          <span>{t("mapV2.layers.signals.showing")}</span>
          <SegmentedControl
            aria-label={t("mapV2.layers.signals.densityDisplay")}
            value={density}
            onChange={(value) => {
              if (isDensityDisplay(value)) onSettingsChange(signalsSettingsFor(value));
            }}
            data={DENSITY_DISPLAYS.map((value) => ({ value, label: t(`mapV2.layers.signals.${value}`) }))}
            withItemsBorders={false}
            classNames={{
              root: classes.switch,
              control: classes.switchControl,
              label: classes.switchLabel,
              indicator: classes.switchIndicator,
            }}
          />
        </div>
        {density === "clusters" ? (
          <div>
            <div className={classes.dots}>
              {DENSITY_DOT_SIZES.map((size) => (
                <span key={size} className={classes.dot} style={{ width: size, height: size }} />
              ))}
            </div>
            <div className={classes.ends}>
              <span>{t("mapV2.layers.signals.fewerSignals")}</span>
              <span>{t("mapV2.layers.signals.moreSignals")}</span>
            </div>
          </div>
        ) : (
          <div>
            <div className={classes.heat} />
            <div className={classes.ends}>
              <span>{t("mapV2.layers.signals.low")}</span>
              <span>{t("mapV2.layers.signals.high")}</span>
            </div>
          </div>
        )}
      </div>
      <h3 className={classes.heading}>{t("mapV2.layers.signals.severity")}</h3>
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
