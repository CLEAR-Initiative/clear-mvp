/**
 * DOM helpers for NRC Sudan office Mapbox HTML markers.
 * Kept out of CrisisMap so marker construction isn't re-created per render.
 */

import {
  SUDAN_NRC_OFFICE_COLORS,
  SUDAN_NRC_OFFICES_SOURCE,
  type SudanNrcOffice,
} from "~/lib/data/sudan-nrc-offices";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export type NrcOfficeMarkerLabels = {
  typeLabel: string;
  statusLabel: string;
  centroidDisclaimer: string;
};

/** Outer shell Mapbox owns; inner node holds the 45° rhomboid. */
export function buildNrcOfficeMarkerElement(
  office: SudanNrcOffice,
  isDark: boolean,
): HTMLDivElement {
  const color = SUDAN_NRC_OFFICE_COLORS[office.officeType];
  const muted = office.status !== "active";
  const diamondSize = office.officeType === "country_office" ? 14 : 11;
  // √2 wrapper so rotated corners aren't clipped by Mapbox marker overflow.
  const wrapSize = Math.ceil(diamondSize * Math.SQRT2) + 2;

  const el = document.createElement("div");
  el.setAttribute("data-nrc-office", office.id);
  el.title = office.name;
  el.style.cssText = [
    `width:${wrapSize}px`,
    `height:${wrapSize}px`,
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "cursor:pointer",
    `opacity:${muted ? 0.65 : 1}`,
    "overflow:visible",
  ].join(";");

  const diamond = document.createElement("div");
  diamond.setAttribute("data-nrc-diamond", "");
  diamond.style.cssText = [
    `width:${diamondSize}px`,
    `height:${diamondSize}px`,
    `background:${color}`,
    `border:2px solid ${isDark ? "#0a0a0a" : "#fff"}`,
    "box-shadow:0 1px 4px rgba(0,0,0,0.35)",
    "border-radius:1px",
    "transform:rotate(45deg)",
    "flex-shrink:0",
  ].join(";");
  el.appendChild(diamond);
  return el;
}

export function buildNrcOfficePopupHtml(
  office: SudanNrcOffice,
  labels: NrcOfficeMarkerLabels,
): string {
  const color = SUDAN_NRC_OFFICE_COLORS[office.officeType];
  const areaLine = office.areaOffice
    ? `<div style="font-size:11px;color:#737373;margin-bottom:6px;">${escapeHtml(office.areaOffice)}</div>`
    : "";
  const addressLine = office.address
    ? `<div style="font-size:11px;color:#525252;margin-top:6px;">${escapeHtml(office.address)}</div>`
    : "";

  return `
    <div style="padding:10px 12px;font-family:inherit;min-width:200px;max-width:260px;">
      <div style="font-weight:700;font-size:13px;color:#171717;margin-bottom:2px;">${escapeHtml(office.name)}</div>
      <div style="font-size:11px;font-weight:600;color:${color};margin-bottom:4px;">
        ${escapeHtml(labels.typeLabel)} · ${escapeHtml(labels.statusLabel)}
      </div>
      ${areaLine}
      <div style="font-size:11px;color:#525252;">${escapeHtml(office.city)}, ${escapeHtml(office.state)}</div>
      ${addressLine}
      <div style="font-size:10px;color:#737373;border-top:1px solid #E5E5E5;margin-top:8px;padding-top:8px;line-height:1.4;">
        ${escapeHtml(labels.centroidDisclaimer)}
      </div>
      <div style="font-size:10px;color:#a3a3a3;margin-top:4px;">
        ${escapeHtml(SUDAN_NRC_OFFICES_SOURCE.report)} · ${escapeHtml(SUDAN_NRC_OFFICES_SOURCE.pages)}
      </div>
    </div>
  `;
}

/** In-place theme update — avoids tearing down Mapbox markers on dark-mode toggle. */
export function paintNrcOfficeMarkerTheme(root: HTMLElement, isDark: boolean): void {
  const diamond = root.querySelector<HTMLElement>("[data-nrc-diamond]");
  if (diamond) diamond.style.borderColor = isDark ? "#0a0a0a" : "#fff";
}
