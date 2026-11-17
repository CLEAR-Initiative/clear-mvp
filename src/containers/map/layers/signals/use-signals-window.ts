import { useEffect, useState } from "react";

const WINDOW_DAYS = 30;

export function signalsWindow(now: Date): { from: string; to: string } {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - WINDOW_DAYS);
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

function msUntilNextMidnight(now: Date): number {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return nextMidnight.getTime() - now.getTime();
}

export function useSignalsWindow(): { from: string; to: string } {
  const [range, setRange] = useState(() => signalsWindow(new Date()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const refresh = () => {
      const now = new Date();
      const next = signalsWindow(now);
      setRange((current) => (current.to === next.to ? current : next));
      clearTimeout(timer);
      timer = setTimeout(refresh, msUntilNextMidnight(now));
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };

    timer = setTimeout(refresh, msUntilNextMidnight(new Date()));
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return range;
}
