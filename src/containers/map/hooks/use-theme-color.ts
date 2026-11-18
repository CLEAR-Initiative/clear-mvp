import { useMemo } from "react";
import { useIsDark } from "~/hooks/use-is-dark";

export function useThemeColors<K extends string>(tokens: Record<K, string>): Record<K, string> {
  const isDark = useIsDark();

  return useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    const entries = Object.entries<string>(tokens).map(([key, token]) => [key, style.getPropertyValue(token).trim()]);
    return Object.fromEntries(entries) as Record<K, string>;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the CSS custom properties change with the theme attribute, which React cannot see.
  }, [tokens, isDark]);
}
