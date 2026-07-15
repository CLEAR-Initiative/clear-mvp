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
  searchParams?: URLSearchParams;
}

export function useEntityNavigation({ paramsId, routePrefix, searchParams }: UseEntityNavigationOptions) {
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
      const queryString = searchParams?.toString();
      const url = queryString ? `${routePrefix}/${targetId}?${queryString}` : `${routePrefix}/${targetId}`;
      router.replace(url, { scroll: false });
    },
    [router, routePrefix, searchParams],
  );

  return { activeId, navigateTo };
}
