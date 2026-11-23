"use client";

import { useCallback, useRef, useState } from "react";
import { MapV2 } from "~/containers/map/lazy";
import type { MapSelectTarget } from "~/containers/map/selection";
import { setMapPanelCollapsedCookie } from "~/lib/map-panel-collapsed-cookie";
import { MapPanel } from "./map-panel";
import { SignalDetailView } from "./signal-detail-view";
import { SignalStackView } from "./signal-stack-view";
import { useInsetLeft } from "./use-inset-left";
import { usePanelSelection } from "./use-panel-selection";

/** The Map panel only exists from this width up (see map-panel.module.css). */
const PANEL_MEDIA_QUERY = "(min-width: 62em)";

export function MapLayout({ initialPanelCollapsed }: { initialPanelCollapsed: boolean }) {
  const [panelCollapsed, setPanelCollapsed] = useState(initialPanelCollapsed);
  const setCollapsed = useCallback((collapsed: boolean) => {
    setPanelCollapsed(collapsed);
    setMapPanelCollapsedCookie(collapsed);
  }, []);
  const togglePanel = useCallback(() => setCollapsed(!panelCollapsed), [panelCollapsed, setCollapsed]);
  const insetProbeRef = useRef<HTMLDivElement>(null);
  const insetLeft = useInsetLeft(insetProbeRef);
  const selection = usePanelSelection();
  const { selectSignal, selectStack, clear } = selection;

  const onSelect = useCallback(
    (target: MapSelectTarget | null) => {
      if (!target) {
        clear();
        return;
      }
      if (target.type === "signal") selectSignal(target.id);
      else selectStack(target.coordinates);
      if (panelCollapsed && window.matchMedia(PANEL_MEDIA_QUERY).matches) setCollapsed(false);
    },
    [clear, selectSignal, selectStack, panelCollapsed, setCollapsed],
  );

  let panelContent: React.ReactNode = null;
  if (selection.signalId) {
    panelContent = (
      <SignalDetailView
        key={selection.signalId}
        signalId={selection.signalId}
        back={selection.stack ? { to: "signals", onBack: selection.closeSignal } : { to: "layers", onBack: clear }}
      />
    );
  } else if (selection.stack) {
    panelContent = (
      <SignalStackView
        key={selection.stackKey}
        point={selection.stack}
        onOpenSignal={selection.openStackSignal}
        onBack={clear}
      />
    );
  }

  return (
    <div className="map-v2-layout" data-panel-collapsed={panelCollapsed ? "true" : undefined}>
      <div ref={insetProbeRef} className="map-v2-inset-probe" aria-hidden />
      <MapPanel
        collapsed={panelCollapsed}
        onToggle={togglePanel}
        contentKey={`${selection.stackKey ?? ""}|${selection.signalId ?? ""}`}
      >
        {panelContent}
      </MapPanel>
      {insetLeft != null && (
        <MapV2
          offset={{ left: insetLeft }}
          selection={selection.mapSelection}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}
