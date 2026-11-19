import { useEffect, useState } from "react";

export function useShowAfterDelay(active: boolean, delayMs: number): boolean {
  const [delayPassed, setDelayPassed] = useState(false);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setDelayPassed(true), delayMs);
    return () => {
      clearTimeout(timer);
      setDelayPassed(false);
    };
  }, [active, delayMs]);

  return active && delayPassed;
}
