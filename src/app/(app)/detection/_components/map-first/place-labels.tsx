"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, type RefObject } from "react";
import type { CrisisMapApi } from "~/components/map/crisis-map";
import css from "./map-first.module.css";

export interface PlaceLabel {
  id: string;
  name: string;
  /** 1 = state, 2 = district. */
  level: 1 | 2;
  lng: number;
  lat: number;
  /** In the location filter (a state also counts when one of its districts is). */
  selected: boolean;
  /** A location filter is set and leaves this place out. */
  dimmed: boolean;
  /** Districts of a picked state show from zoom 6 instead of 7. */
  early: boolean;
  title: string;
}

export interface PlaceLabelsHandle {
  /** Re-place every label for the current camera (called on each map frame). */
  layout: () => void;
}

interface PlaceLabelsProps {
  labels: readonly PlaceLabel[];
  apiRef: RefObject<CrisisMapApi | null>;
  /** Click filters to the place; shift-click adds or removes it. */
  onPick: (id: string, additive: boolean) => void;
}

/** Off-screen margin (px) before a label is hidden. */
const MARGIN = 80;

/**
 * State and district names over the map, clickable to filter. They follow the
 * camera imperatively (no React render per frame): each frame projects the
 * labels that the zoom allows and hides the rest.
 */
export const PlaceLabels = forwardRef<PlaceLabelsHandle, PlaceLabelsProps>(function PlaceLabels({ labels, apiRef, onPick }, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, HTMLButtonElement>());
  const labelsRef = useRef(labels);

  const layout = useCallback(() => {
    const api = apiRef.current;
    const root = rootRef.current;
    const zoom = api?.getViewCamera()?.zoom;
    const width = root?.clientWidth ?? 0;
    const height = root?.clientHeight ?? 0;
    for (const l of labelsRef.current) {
      const el = els.current.get(l.id);
      if (!el) continue;
      const minZoom = l.level === 1 ? 0 : l.early ? 6 : 7;
      const p = api && zoom != null && zoom >= minZoom ? api.projectMarker(-1, l.lng, l.lat) : null;
      if (!p || p.x < -MARGIN || p.y < -MARGIN || p.x > width + MARGIN || p.y > height + MARGIN) {
        el.style.visibility = "hidden";
        continue;
      }
      el.style.visibility = "visible";
      // States centre on their point; districts sit 6px below theirs.
      el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, ${l.level === 1 ? "-50%" : "6px"})`;
    }
  }, [apiRef]);

  useImperativeHandle(ref, () => ({ layout }), [layout]);
  useLayoutEffect(() => {
    labelsRef.current = labels;
    layout();
  });

  // Until the map is ready no frame fires; retry a few times so labels show
  // even when the map loads without moving.
  useEffect(() => {
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (apiRef.current?.getViewCamera()) layout();
      if (apiRef.current?.getViewCamera() || tries > 40) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [apiRef, layout]);

  return (
    <div ref={rootRef} className={css.placeLabels}>
      {labels.map((l) => (
        <button
          key={l.id}
          ref={(el) => {
            if (el) els.current.set(l.id, el);
            else els.current.delete(l.id);
          }}
          type="button"
          data-testid={`place-label-${l.id}`}
          className={[
            css.placeLabel,
            l.level === 1 ? css.stateLabel : css.districtLabel,
            l.selected ? css.placeLabelOn : "",
            l.dimmed ? css.placeLabelDim : "",
          ].join(" ")}
          style={{ visibility: "hidden" }}
          title={l.title}
          aria-pressed={l.selected}
          onClick={(e) => onPick(l.id, e.shiftKey)}
        >
          {l.name}
        </button>
      ))}
    </div>
  );
});
