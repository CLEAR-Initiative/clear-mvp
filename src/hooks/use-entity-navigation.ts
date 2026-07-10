import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** True when the UI target differs from the entity currently rendered. */
export function deriveEntityPending(
  activeId: string,
  resolvedEntity: { id: string } | null | undefined,
): boolean {
  return resolvedEntity != null && activeId !== resolvedEntity.id;
}

interface UseEntityNavigationOptions {
  paramsId: string;
  routePrefix: `/signal` | `/event`;
}

export function useEntityNavigation({ paramsId, routePrefix }: UseEntityNavigationOptions) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(paramsId);
  const prevParamsIdRef = useRef(paramsId);

  if (paramsId !== prevParamsIdRef.current) {
    prevParamsIdRef.current = paramsId;
    setActiveId(paramsId);
  }

  const navigateTo = useCallback(
    (targetId: string) => {
      setActiveId(targetId);
      router.replace(`${routePrefix}/${targetId}`, { scroll: false });
    },
    [router, routePrefix],
  );

  return { activeId, navigateTo };
}
