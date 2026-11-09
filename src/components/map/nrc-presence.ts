/**
 * Overview presence map ("NRC presence map" design handoff, option A):
 * NRC countries filled orange, one NRC logo pin per country, and a zoom
 * floor at the NRC footprint. Values here are the design's final values;
 * change them with the design, not ad hoc.
 *
 * Pins are a symbol layer, not DOM markers: they shrink with zoom and never
 * hide, and Mapbox keeps them aligned while the camera moves.
 */

import { NRC_LETTER_PATHS, NRC_ORANGE } from "~/components/ui/nrc-logo-mark";
import { SUDAN_NRC_OFFICES, type SudanNrcOffice } from "~/lib/data/sudan-nrc-offices";

export const PRESENCE_SOURCE = "nrc-presence-countries";
export const PRESENCE_POINTS = "nrc-presence-points";
export const PRESENCE_FILL = "nrc-presence-fill";
export const PRESENCE_LINE = "nrc-presence-line";
export const PRESENCE_SELECTED_LINE = "nrc-presence-selected-line";
export const PRESENCE_PINS = "nrc-presence-pins";
export const PRESENCE_LABELS = "nrc-presence-labels";
export const PRESENCE_PIN_IMAGE = "nrc-presence-pin";

/** Fill and borders are the same in both themes. */
export const PRESENCE_FILL_COLOR = "#E85D3D";
export const PRESENCE_LINE_COLOR = "#F4A08A";

/** The zoom-out floor: the user never sees further out than this box. */
export const PRESENCE_FOOTPRINT: [[number, number], [number, number]] = [[-108, -38], [100, 57]];
export const PRESENCE_FOOTPRINT_PADDING = { top: 70, bottom: 30, left: 30, right: 30 };

export const PRESENCE_FLY_MS = 1100;
export const PRESENCE_COUNTRY_MAX_ZOOM = 6.5;
/** Country labels next to the pins appear from this zoom. */
export const PRESENCE_LABEL_MIN_ZOOM = 2.6;

/** Fill opacity: hover in the world state, selected vs other NRC countries in the country state. */
export function presenceFillOpacity(selectedIso: string | null): unknown {
  if (selectedIso) {
    return ["case", ["==", ["get", "iso_3166_1"], selectedIso], 0.26, 0.08];
  }
  return ["case", ["boolean", ["feature-state", "hover"], false], 0.62, 0.42];
}

/** Borders are invisible at world zoom and fade in towards the country scale. */
export function presenceLineOpacity(selectedIso: string | null): unknown {
  if (selectedIso) return 0;
  const hover = ["boolean", ["feature-state", "hover"], false];
  return [
    "interpolate", ["linear"], ["zoom"],
    2.8, ["case", hover, 0.6, 0],
    4.5, ["case", hover, 0.9, 0.45],
  ];
}

export const PRESENCE_PIN_SIZE: unknown = [
  "interpolate", ["linear"], ["zoom"],
  1.5, 0.46,
  2.5, 0.58,
  4, 0.78,
  6, 0.95,
];

export function presenceLabelPaint(isDark: boolean) {
  return {
    "text-color": isDark ? "#F0F0F0" : "#171717",
    "text-halo-color": isDark ? "#111111" : "#FFFFFF",
    "text-halo-width": 1.4,
  };
}

/** Only one worldview's polygon per country, so the fill isn't stacked. */
export const SINGLE_WORLDVIEW: unknown = ["match", ["get", "worldview"], ["all", "US"], true, false];

/**
 * The NRC logo pin: orange teardrop with the NRC letters in the head, a
 * soft drop shadow and a small ground shadow. 40x52 CSS px at pixelRatio 2.
 */
export function nrcPinSvg(): string {
  const letters = NRC_LETTER_PATHS.map((d) => `<path d="${d}"/>`).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="104" viewBox="0 0 40 52">` +
    `<defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%">` +
    `<feDropShadow dx="0" dy="1.5" stdDeviation="1.6" flood-color="#000" flood-opacity="0.55"/>` +
    `</filter></defs>` +
    `<ellipse cx="20" cy="49.5" rx="4" ry="1.4" fill="#000" opacity="0.45"/>` +
    `<path filter="url(#s)" d="M20 2C10.6 2 3 9.6 3 19c0 12.2 14.6 27.2 16.1 28.7a1.3 1.3 0 0 0 1.8 0C22.4 46.2 37 31.2 37 19 37 9.6 29.4 2 20 2z" fill="${NRC_ORANGE}" stroke="#111111" stroke-width="1.2"/>` +
    `<g transform="translate(6.6685,2.8961) scale(0.117978)"><g fill="#FFFFFF">${letters}</g></g>` +
    `</svg>`
  );
}

export const nrcPinDataUrl = (): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(nrcPinSvg())}`;

let pinImage: Promise<HTMLImageElement> | null = null;

/** The pin as a loaded image, decoded once per page. */
export function loadNrcPinImage(): Promise<HTMLImageElement> {
  pinImage ??= new Promise((resolve, reject) => {
    const img = new Image(80, 104);
    img.onload = () => resolve(img);
    img.onerror = () => {
      pinImage = null;
      reject(new Error("NRC pin image failed to load"));
    };
    img.src = nrcPinDataUrl();
  });
  return pinImage;
}

/** Sudan's offices on the presence map: current ones only, no former or planned offices. */
export const PRESENCE_SUDAN_OFFICES: SudanNrcOffice[] = SUDAN_NRC_OFFICES.filter(
  (o) => o.officeType !== "former_country_office" && o.officeType !== "planned_or_expansion",
);
