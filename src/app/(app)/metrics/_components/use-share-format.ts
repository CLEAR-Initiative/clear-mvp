import { useFormatter } from "next-intl";

/** Formats a share as a whole percent, or "—" when it has no denominator. */
export function useShareFormat(): (share: number | null) => string {
  const format = useFormatter();
  return (share) =>
    share === null ? "—" : format.number(share, { style: "percent", maximumFractionDigits: 0 });
}
