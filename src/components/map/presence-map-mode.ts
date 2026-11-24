/**
 * The Overview presence map as one map mode (design handoff "NRC presence
 * map", option A): NRC countries filled orange with one logo pin each, a zoom
 * floor at the NRC footprint, and a country state with office markers.
 *
 * This module owns everything the mode puts on the map: its sources, layers,
 * event handlers, DOM markers and camera moves. The map component calls three
 * things only:
 *
 *   const mode = addPresenceMap(map, mapboxgl, config, memory);  // add
 *   mode.update(state);                                          // update
 *   mode.remove();                                               // remove
 *
 * Why a module: `crisis-map.tsx` had every mode as effects on one shared map.
 * Two effects that are each correct can still clash inside one frame, which
 * is how GlitchTip prod #912 happened. One owner per mode keeps the order of
 * its map calls in one place. See docs/map-modes.md.
 *
 * Values (colours, opacities, zooms) live in `./nrc-presence`.
 */

import { buildNrcOfficeMarkerElement } from "~/lib/map/nrc-office-markers";
import { setMapCursor } from "~/lib/map/map-cursor";
import { reportMapError } from "~/lib/map/report-map-error";
import { setPaintPropertySafe } from "~/lib/map/safe-paint";
import {
  PRESENCE_COUNTRY_MAX_ZOOM,
  PRESENCE_FILL,
  PRESENCE_FILL_COLOR,
  PRESENCE_FLY_MS,
  PRESENCE_FOOTPRINT,
  PRESENCE_FOOTPRINT_PADDING,
  PRESENCE_LABEL_MIN_ZOOM,
  PRESENCE_LABELS,
  PRESENCE_LINE,
  PRESENCE_LINE_COLOR,
  PRESENCE_LINE_OPACITY,
  PRESENCE_PIN_IMAGE,
  PRESENCE_PIN_SIZE,
  PRESENCE_PINS,
  PRESENCE_POINTS,
  PRESENCE_SELECTED_LINE,
  PRESENCE_SOURCE,
  PRESENCE_SUDAN_OFFICES,
  SINGLE_WORLDVIEW,
  loadNrcPinImage,
  nrcPinDataUrl,
  presenceFillOpacity,
  presenceLabelPaint,
  presenceLineVisibility,
} from "./nrc-presence";

// The Mapbox GL map and module, loaded at runtime and untyped in this app.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapboxMap = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapboxModule = any;

/** A country with an NRC country office. */
export interface PresenceCountry {
  iso2: string;
  name: string;
  pinLngLat: [number, number];
  /** [west, south, east, north], framed when the country is selected. */
  bbox: readonly [number, number, number, number];
}

/** Hover over an office marker in the presence map's country state. */
export type PresenceOfficeHover =
  | { kind: "office"; officeId: string }
  | { kind: "countryOffice"; iso2: string };

/** Presence map hover, positioned in map container pixels. */
export type PresenceHover = { x: number; y: number } & (
  | { kind: "country"; iso2: string }
  | PresenceOfficeHover
);

/** What changes while the mode is on the map. */
export interface PresenceState {
  /** The selected country (country state), upper case, or null for the world state. */
  selectedIso: string | null;
  /** Width (px) of a panel over the map's right edge. */
  insetRight: number;
  /** Height (px) of a sheet over the map's bottom edge. */
  insetBottom: number;
}

export interface PresenceConfig {
  countries: readonly PresenceCountry[];
  /** The state to start in. */
  state: PresenceState;
  /** Read when labels and office markers are built. */
  isDark: () => boolean;
  /** Hover over a country, pin or office; null when it ends. */
  onHover: (hover: PresenceHover | null) => void;
  /** A click on a country that is not the selected one. */
  onSelect: (iso2: string) => void;
}

/**
 * What must outlive a rebuild. The layers are removed and added again when
 * the style reloads (theme or basemap change), and the camera and selection
 * must survive that. The map component keeps one of these for as long as the
 * presence map is shown.
 */
export interface PresenceMemory {
  /** The world view to fly back to. */
  worldView: { center: [number, number]; zoom: number } | null;
  /** True once the map has jumped to the world view. It jumps only once. */
  floorSet: boolean;
  /** The selection and insets the camera last moved for. */
  cameraSelected: string | null;
  cameraInsets: string;
}

export function createPresenceMemory(): PresenceMemory {
  return { worldView: null, floorSet: false, cameraSelected: null, cameraInsets: "" };
}

export interface PresenceMapMode {
  /** Apply a new selection or new panel insets. */
  update(state: PresenceState): void;
  /** Take the mode off the map: layers, sources, handlers, markers. */
  remove(): void;
}

const sameState = (a: PresenceState, b: PresenceState) =>
  a.selectedIso === b.selectedIso && a.insetRight === b.insetRight && a.insetBottom === b.insetBottom;

/**
 * Put the presence map on `map`. Call it when the style is loaded, and call
 * `remove()` before the style is replaced.
 */
export function addPresenceMap(
  m: MapboxMap,
  mb: MapboxModule,
  config: PresenceConfig,
  memory: PresenceMemory,
): PresenceMapMode {
  const { countries } = config;
  let state = config.state;
  let removed = false;
  // The point layers wait for the pin image. Selection is applied after them.
  let ready = false;
  let applied: PresenceState | null = null;
  let markers: MapboxMap[] = [];

  const isos = countries.map((c) => c.iso2.toUpperCase());
  const isoFilter: unknown = ["in", ["get", "iso_3166_1"], ["literal", isos]];
  const selectedAtStart = state.selectedIso;
  const styleLayers = m.getStyle().layers as Array<{ id: string; type: string }>;
  const firstSymbolId = styleLayers.find((l) => l.type === "symbol")?.id;

  m.addSource(PRESENCE_SOURCE, {
    type: "vector",
    url: "mapbox://mapbox.country-boundaries-v1",
    promoteId: { country_boundaries: "iso_3166_1" },
  });
  m.addLayer(
    {
      id: PRESENCE_FILL,
      type: "fill",
      source: PRESENCE_SOURCE,
      "source-layer": "country_boundaries",
      filter: ["all", SINGLE_WORLDVIEW, isoFilter],
      paint: {
        "fill-color": PRESENCE_FILL_COLOR,
        "fill-opacity": presenceFillOpacity(selectedAtStart),
      },
    },
    firstSymbolId,
  );
  m.addLayer(
    {
      id: PRESENCE_LINE,
      type: "line",
      source: PRESENCE_SOURCE,
      "source-layer": "country_boundaries",
      filter: ["all", SINGLE_WORLDVIEW, isoFilter],
      layout: { visibility: presenceLineVisibility(selectedAtStart) },
      paint: {
        "line-color": PRESENCE_LINE_COLOR,
        "line-width": 0.6,
        "line-opacity": PRESENCE_LINE_OPACITY,
      },
    },
    firstSymbolId,
  );
  m.addLayer(
    {
      id: PRESENCE_SELECTED_LINE,
      type: "line",
      source: PRESENCE_SOURCE,
      "source-layer": "country_boundaries",
      filter: ["all", SINGLE_WORLDVIEW, ["==", ["get", "iso_3166_1"], selectedAtStart ?? ""]],
      paint: {
        "line-color": PRESENCE_LINE_COLOR,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1, 7, 1.6],
        "line-opacity": 0.9,
      },
    },
    firstSymbolId,
  );
  m.addSource(PRESENCE_POINTS, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: countries.map((c) => ({
        type: "Feature",
        properties: { iso_3166_1: c.iso2.toUpperCase(), country: c.name },
        geometry: { type: "Point", coordinates: c.pinLngLat },
      })),
    },
  });
  const worldLayerVisibility = selectedAtStart ? "none" : "visible";
  const addPointLayers = () => {
    if (removed || !m.getSource(PRESENCE_POINTS) || m.getLayer(PRESENCE_PINS)) return;
    m.addLayer({
      id: PRESENCE_PINS,
      type: "symbol",
      source: PRESENCE_POINTS,
      layout: {
        visibility: worldLayerVisibility,
        "icon-image": PRESENCE_PIN_IMAGE,
        "icon-anchor": "bottom",
        "icon-size": PRESENCE_PIN_SIZE,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "symbol-z-order": "viewport-y",
      },
    });
    m.addLayer({
      id: PRESENCE_LABELS,
      type: "symbol",
      source: PRESENCE_POINTS,
      minzoom: PRESENCE_LABEL_MIN_ZOOM,
      layout: {
        visibility: worldLayerVisibility,
        "text-field": ["get", "country"],
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 11,
        "text-anchor": "left",
        "text-offset": [1, -0.1],
        "text-optional": true,
      },
      paint: presenceLabelPaint(config.isDark()),
    });
    ready = true;
    apply();
  };
  loadNrcPinImage()
    .then((img) => {
      if (removed || !m.getStyle()) return;
      if (!m.hasImage(PRESENCE_PIN_IMAGE)) m.addImage(PRESENCE_PIN_IMAGE, img, { pixelRatio: 2 });
      addPointLayers();
    })
    .catch(() => {
      // Without the artwork the pins can't draw; fills, labels and clicks still work.
      addPointLayers();
    });

  // Basemap country names: none at world zoom, then only non-NRC countries
  // (the pin labels name the NRC ones); in a country, all of them.
  const LABELS = "country-label";
  const hasLabels = !!m.getLayer(LABELS);
  const baseLabelFilter: unknown = hasLabels ? m.getFilter(LABELS) : undefined;
  const noLabels: unknown = ["==", ["get", "iso_3166_1"], "__none__"];
  const nonNrcLabels: unknown = ["all", ...(baseLabelFilter ? [baseLabelFilter] : []), ["!", isoFilter]];
  let labelState = "";
  const syncLabels = () => {
    if (!hasLabels) return;
    const next = state.selectedIso ? "all" : m.getZoom() < 3 ? "none" : "nonNrc";
    if (next === labelState) return;
    labelState = next;
    const filter = next === "all" ? (baseLabelFilter ?? null) : next === "none" ? noLabels : nonNrcLabels;
    try {
      m.setFilter(LABELS, filter);
    } catch (mapErr) {
      reportMapError(m, mapErr, "setFilter");
    }
  };
  syncLabels();

  // Zoom floor: never further out than the whole NRC footprint.
  const fitFloor = (jump: boolean) => {
    const cam = m.cameraForBounds(PRESENCE_FOOTPRINT, { padding: PRESENCE_FOOTPRINT_PADDING });
    if (!cam) return;
    const c = cam.center as { lng: number; lat: number } | [number, number];
    const center: [number, number] = Array.isArray(c) ? c : [c.lng, c.lat];
    // No extra floor: a phone-width map needs a zoom below 1 to fit.
    const zoom = Math.max(0, cam.zoom ?? 0);
    memory.worldView = { center, zoom };
    m.setMinZoom(zoom);
    if (jump) m.jumpTo({ center, zoom });
  };
  fitFloor(!memory.floorSet && !selectedAtStart);
  memory.floorSet = true;
  const onResize = () => fitFloor(false);
  const renderWorldCopies = m.getRenderWorldCopies?.() ?? true;
  m.setRenderWorldCopies?.(false);
  m.dragRotate?.disable();
  m.touchZoomRotate?.disableRotation();
  m.keyboard?.disableRotation?.();

  let hoveredIso: string | null = null;
  const setHoverState = (iso: string | null) => {
    if (hoveredIso === iso) return;
    const target = (id: string) => ({ source: PRESENCE_SOURCE, sourceLayer: "country_boundaries", id });
    try {
      if (hoveredIso) m.setFeatureState(target(hoveredIso), { hover: false });
    } catch (mapErr) {
      reportMapError(m, mapErr, "setFeatureState");
    }
    hoveredIso = iso;
    try {
      if (iso) m.setFeatureState(target(iso), { hover: true });
    } catch (mapErr) {
      reportMapError(m, mapErr, "setFeatureState");
    }
  };
  const isoAt = (point: unknown): string | null => {
    const layers = [PRESENCE_PINS, PRESENCE_FILL].filter(
      (l) => m.getLayer(l) && m.getLayoutProperty(l, "visibility") !== "none",
    );
    const iso: unknown = m.queryRenderedFeatures(point, { layers })[0]?.properties?.iso_3166_1;
    return typeof iso === "string" && iso ? iso : null;
  };
  // Office markers are DOM nodes inside the map; they handle their own events.
  const onMarker = (e: MapboxMap) =>
    !!(e.originalEvent?.target as HTMLElement | null)?.closest?.(".mapboxgl-marker");
  const onMove = (e: MapboxMap) => {
    if (onMarker(e)) return;
    const iso = isoAt(e.point);
    const current = state.selectedIso;
    setMapCursor(m, iso && iso !== current ? "pointer" : "");
    if (current) return;
    setHoverState(iso);
    config.onHover(iso ? { kind: "country", iso2: iso, x: e.point.x, y: e.point.y } : null);
  };
  const onOut = () => {
    setHoverState(null);
    setMapCursor(m, "");
    if (!state.selectedIso) config.onHover(null);
  };
  const onClick = (e: MapboxMap) => {
    if (onMarker(e)) return;
    const iso = isoAt(e.point);
    if (iso && iso !== state.selectedIso) {
      setHoverState(null);
      config.onHover(null);
      config.onSelect(iso);
    }
  };
  m.on("mousemove", onMove);
  m.on("mouseout", onOut);
  m.on("click", onClick);
  m.on("zoomend", syncLabels);
  m.on("resize", onResize);

  const removeMarkers = () => {
    for (const mk of markers) {
      try {
        mk.remove();
      } catch (mapErr) {
        reportMapError(m, mapErr, "remove");
      }
    }
    markers = [];
  };

  /** Selection: world state vs country state, camera, and office markers. */
  function apply(): void {
    if (removed || !ready) return;
    const hadMarkers = applied !== null;
    applied = state;
    const selected = state.selectedIso;
    const country = selected ? countries.find((c) => c.iso2.toUpperCase() === selected) : undefined;

    // The previous state's markers go first, as its hover does.
    removeMarkers();
    if (hadMarkers) config.onHover(null);

    try {
      // One owner for these calls, in this order: the paint value keeps
      // reading feature-state (see ~/lib/map/safe-paint), and the borders are
      // hidden with visibility, never by zeroing line-opacity.
      if (m.getLayer(PRESENCE_FILL)) setPaintPropertySafe(m, PRESENCE_FILL, "fill-opacity", presenceFillOpacity(selected));
      if (m.getLayer(PRESENCE_LINE)) m.setLayoutProperty(PRESENCE_LINE, "visibility", presenceLineVisibility(selected));
      if (m.getLayer(PRESENCE_SELECTED_LINE)) {
        m.setFilter(PRESENCE_SELECTED_LINE, ["all", SINGLE_WORLDVIEW, ["==", ["get", "iso_3166_1"], selected ?? ""]]);
      }
      for (const id of [PRESENCE_PINS, PRESENCE_LABELS]) {
        if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", selected ? "none" : "visible");
      }
    } catch (mapErr) {
      // Style reloading.
      reportMapError(m, mapErr, "setPaintProperty");
    }
    syncLabels();

    // Zoom buttons move out from under the country panel.
    const inset = state.insetRight;
    const controls = m.getContainer().querySelector(".mapboxgl-ctrl-bottom-right") as HTMLElement | null;
    if (controls) {
      controls.style.transition = "right 300ms ease";
      controls.style.right = selected ? `${inset}px` : "0px";
    }

    // Camera only on a real selection change or a panel size change, not on
    // a theme rebuild.
    const previous = memory.cameraSelected;
    memory.cameraSelected = selected;
    const insetKey = `${inset}:${state.insetBottom}`;
    const insetChanged = memory.cameraInsets !== insetKey;
    memory.cameraInsets = insetKey;
    if (selected !== previous || (country && insetChanged)) {
      if (country) {
        const [w, s, e, n] = country.bbox;
        m.fitBounds(
          [
            [w, s],
            [e, n],
          ],
          {
            padding: { top: 70, bottom: state.insetBottom + 50, left: 50, right: inset + 50 },
            maxZoom: PRESENCE_COUNTRY_MAX_ZOOM,
            duration: PRESENCE_FLY_MS,
          },
        );
      } else if (previous && memory.worldView) {
        m.flyTo({ ...memory.worldView, duration: PRESENCE_FLY_MS });
      }
    }

    // Office markers: the country office as the NRC pin, other offices as
    // the existing diamonds. Only Sudan has office data so far.
    if (!country) return;
    const hover = (el: HTMLElement, lngLat: [number, number], payload: PresenceOfficeHover) => {
      el.addEventListener("mouseenter", () => {
        const p = m.project(lngLat);
        config.onHover({ ...payload, x: p.x, y: p.y });
      });
      el.addEventListener("mouseleave", () => config.onHover(null));
    };
    const pin = (lngLat: [number, number], payload: PresenceOfficeHover) => {
      const el = document.createElement("div");
      el.style.cssText = "width:34px;height:44px;cursor:default";
      el.innerHTML = `<img src="${nrcPinDataUrl()}" width="34" height="44" alt="" style="display:block" />`;
      hover(el, lngLat, payload);
      markers.push(new mb.Marker({ element: el, anchor: "bottom" }).setLngLat(lngLat).addTo(m));
    };
    if (selected === "SD") {
      for (const office of PRESENCE_SUDAN_OFFICES) {
        const lngLat: [number, number] = [office.longitude, office.latitude];
        const payload: PresenceOfficeHover = { kind: "office", officeId: office.id };
        if (office.officeType === "country_office") {
          pin(lngLat, payload);
          continue;
        }
        const el = buildNrcOfficeMarkerElement(office, config.isDark());
        el.style.cursor = "default";
        hover(el, lngLat, payload);
        markers.push(new mb.Marker({ element: el }).setLngLat(lngLat).addTo(m));
      }
    } else {
      pin(country.pinLngLat, { kind: "countryOffice", iso2: selected! });
    }
  }

  return {
    update(next) {
      if (removed) return;
      state = next;
      if (applied && sameState(applied, next)) return;
      apply();
    },
    remove() {
      if (removed) return;
      removed = true;
      const hadMarkers = applied !== null;
      removeMarkers();
      if (hadMarkers) config.onHover(null);
      try {
        m.off("mousemove", onMove);
        m.off("mouseout", onOut);
        m.off("click", onClick);
        m.off("zoomend", syncLabels);
        m.off("resize", onResize);
      } catch (mapErr) {
        reportMapError(m, mapErr, "off");
      }
      try {
        if (hasLabels && labelState !== "all") m.setFilter(LABELS, baseLabelFilter ?? null);
        for (const id of [PRESENCE_LABELS, PRESENCE_PINS, PRESENCE_SELECTED_LINE, PRESENCE_LINE, PRESENCE_FILL]) {
          if (m.getLayer(id)) m.removeLayer(id);
        }
        for (const id of [PRESENCE_POINTS, PRESENCE_SOURCE]) if (m.getSource(id)) m.removeSource(id);
        m.setMinZoom(0);
        m.setRenderWorldCopies?.(renderWorldCopies);
        m.dragRotate?.enable();
        m.touchZoomRotate?.enableRotation();
        m.keyboard?.enableRotation?.();
      } catch (mapErr) {
        // Style already gone.
        reportMapError(m, mapErr, "setFilter");
      }
      setMapCursor(m, "");
    },
  };
}
