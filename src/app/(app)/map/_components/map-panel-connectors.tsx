"use client";

import type { MarkerScreenPoint } from "~/components/map/crisis-map";
import styles from "./map-panel-connectors.module.css";

export interface PanelGeometry {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PanelConnectorLink {
  id: number;
  pin: MarkerScreenPoint;
  panel: PanelGeometry;
  /** Dim non-focused panels slightly when several are open. */
  emphasized?: boolean;
}

/**
 * Midpoint of the vertical edge facing the pin — diagonal into the card centerline.
 */
export function panelAttachmentPoint(
  pin: MarkerScreenPoint,
  panel: PanelGeometry,
): MarkerScreenPoint {
  const midX = panel.left + panel.width / 2;
  const midY = panel.top + panel.height / 2;
  return {
    x: pin.x < midX ? panel.left : panel.left + panel.width,
    y: midY,
  };
}

interface MapPanelConnectorsProps {
  links: PanelConnectorLink[];
}

/**
 * Dashed orange SVG “spaghetti” diagonals from each open marker panel to its pin.
 * Desktop `/map` only — pointer-events none so the map stays interactive.
 */
export function MapPanelConnectors({ links }: MapPanelConnectorsProps) {
  if (links.length === 0) return null;

  return (
    <svg
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 15,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      {links.map((link) => {
        const end = panelAttachmentPoint(link.pin, link.panel);
        const opacity = link.emphasized === false ? 0.5 : 0.95;
        return (
          <line
            key={link.id}
            className={styles.line}
            x1={link.pin.x}
            y1={link.pin.y}
            x2={end.x}
            y2={end.y}
            stroke="var(--color-accent)"
            strokeWidth={1.75}
            strokeDasharray="7 5"
            strokeLinecap="round"
            opacity={opacity}
          />
        );
      })}
    </svg>
  );
}
