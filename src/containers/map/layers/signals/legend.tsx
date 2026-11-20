"use client";

import { useTranslations } from "next-intl";
import { SEVERITY_BUCKETS, SEVERITY_TOKENS } from "./severity-tokens";
import classes from "./legend.module.css";

export function SignalsLegend() {
  const t = useTranslations();

  return (
    <div className={classes.root}>
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
