import { useFormatter } from "next-intl";

/** Formats the Agent metrics: USD amounts, seconds from milliseconds, and
 * plain decimals, each "—" when clear-api had nothing to average. */
export function useAgentFormat() {
  const format = useFormatter();
  return {
    usd: (value: number | null, maxFractionDigits = 2): string =>
      value === null
        ? "—"
        : format.number(value, {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: maxFractionDigits,
          }),
    seconds: (ms: number | null): string =>
      ms === null ? "—" : format.number(ms / 1000, { style: "unit", unit: "second", maximumFractionDigits: 1 }),
    decimal: (value: number | null, maxFractionDigits = 1): string =>
      value === null ? "—" : format.number(value, { maximumFractionDigits: maxFractionDigits }),
  };
}
