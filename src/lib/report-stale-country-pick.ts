"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { staleCountryPick } from "~/hooks/use-team-country";

/**
 * Client tripwire for the silent country-picker pin.
 *
 * GlitchTip / Sentry only see throws. This path never threw: onChange ran,
 * state updated, then a derived `teamCountryName ?? pick` snapped the value
 * back. Call after resolving the displayed country so a regression pages us.
 */
let lastFingerprint = "";

export function reportStaleCountryPick(args: {
  options: readonly string[];
  picked: string;
  selected: string;
}): void {
  const finding = staleCountryPick(args);
  if (!finding) return;

  const fingerprint = `${finding.picked}|${finding.selected}|${finding.options.join(",")}`;
  if (fingerprint === lastFingerprint) return;
  lastFingerprint = fingerprint;

  Sentry.captureMessage("Country picker discarded an in-scope pick", {
    level: "error",
    extra: finding,
    fingerprint: ["stale-country-pick", finding.picked, finding.selected],
    tags: { feature: "country-picker" },
  });
}

export function useReportStaleCountryPick(
  options: readonly string[],
  picked: string,
  selected: string,
): void {
  useEffect(() => {
    reportStaleCountryPick({ options, picked, selected });
  }, [options, picked, selected]);
}
