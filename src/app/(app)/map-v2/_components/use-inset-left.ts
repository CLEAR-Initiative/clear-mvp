import { useLayoutEffect, useState, type RefObject } from "react";

export function useInsetLeft(probeRef: RefObject<HTMLElement | null>): number | null {
  const [insetLeft, setInsetLeft] = useState<number | null>(null);

  useLayoutEffect(() => {
    const probe = probeRef.current;
    if (!probe) return;
    const measure = () => setInsetLeft(Math.round(probe.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(probe);
    return () => observer.disconnect();
  }, [probeRef]);

  return insetLeft;
}
