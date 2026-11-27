"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";
import { MapV2 } from "~/containers/map/lazy";
import { Timeline } from "~/containers/map/timeline";
import { TimeframeQueryProvider } from "~/containers/map/hooks/use-timeframe";
import { useMapPlace } from "~/containers/map/hooks/use-map-place";
import type { MapSelectTarget } from "~/containers/map/selection";
import { setMapPanelCollapsedCookie } from "~/lib/map-panel-collapsed-cookie";
import type { DetectionKind } from "~/containers/map/selection";
import { MapPanel } from "./map-panel";
import { AlertDetailView } from "./map-panel/alert-detail-view";
import { backToList, type PanelBack } from "./map-panel/back-link";
import { CrisisLayer } from "./map-panel/crisis-layer";
import { PlaceHeader } from "./map-panel/place-header";
import { EventDetailView } from "./map-panel/event-detail-view";
import { MapSheet } from "./map-panel/map-sheet";
import { SignalDetailView } from "./map-panel/signal-detail-view";
import { StackView } from "./map-panel/stack-view";
import { usePanelLayout } from "./map-panel/use-panel-layout";
import { useInsetLeft } from "./use-inset-left";
import { usePanelSelection } from "./use-panel-selection";
import { usePlaceFit } from "./use-place-fit";

const PANEL_TOGGLE_CLEARANCE = 48;

function DetailView({ kind, id, back }: { kind: DetectionKind; id: string; back: PanelBack }) {
  if (kind === "event") return <EventDetailView eventId={id} back={back} />;
  if (kind === "alert") return <AlertDetailView alertId={id} back={back} />;
  return <SignalDetailView signalId={id} back={back} />;
}

export function MapLayout({ initialPanelCollapsed }: { initialPanelCollapsed: boolean }) {
  const [panelCollapsed, setPanelCollapsed] = useState(initialPanelCollapsed);
  const setCollapsed = useCallback((collapsed: boolean) => {
    setPanelCollapsed(collapsed);
    setMapPanelCollapsedCookie(collapsed);
  }, []);
  const togglePanel = useCallback(() => setCollapsed(!panelCollapsed), [panelCollapsed, setCollapsed]);
  const insetProbeRef = useRef<HTMLDivElement>(null);
  const insetLeft = useInsetLeft(insetProbeRef);
  const [timeline, setTimeline] = useState({ height: 0, open: false });
  const onTimelineHeightChange = useCallback(
    (height: number, open: boolean) =>
      setTimeline((prev) => (prev.height === height && prev.open === open ? prev : { height, open })),
    [],
  );
  const selection = usePanelSelection();
  const { selectDetail, selectStack, clear } = selection;
  const layout = usePanelLayout();
  const { status: placeStatus, place } = useMapPlace();
  const fitTo = usePlaceFit(placeStatus, place);
  // A link to a selection opens the sheet on it; otherwise the sheet starts lowered to its peek.
  const [sheetExpanded, setSheetExpanded] = useState(() => Boolean(selection.kind));

  const onSelect = useCallback(
    (target: MapSelectTarget | null) => {
      if (!target) {
        clear();
        setSheetExpanded(false);
        return;
      }
      if (target.type === "detection") selectDetail(target.kind, target.id);
      else selectStack(target.kind, target.coordinates);
      if (layout === "sheet") setSheetExpanded(true);
      else if (panelCollapsed) setCollapsed(false);
    },
    [clear, selectDetail, selectStack, layout, panelCollapsed, setCollapsed],
  );

  const { kind } = selection;
  let panelContent: React.ReactNode = null;
  if (kind && selection.detailId) {
    panelContent = (
      <DetailView
        key={`${kind}:${selection.detailId}`}
        kind={kind}
        id={selection.detailId}
        back={
          selection.stack ? { to: backToList(kind), onBack: selection.closeDetail } : { to: "layers", onBack: clear }
        }
      />
    );
  } else if (kind && selection.stack) {
    panelContent = (
      <StackView
        key={`${kind}:${selection.stackKey}`}
        kind={kind}
        point={selection.stack}
        onOpen={selection.openStackDetail}
        onBack={clear}
      />
    );
  } else {
    panelContent = (
      <>
        <PlaceHeader onPlaceChange={clear} />
        <CrisisLayer onLevelChange={clear} />
      </>
    );
  }

  const contentKey = `${kind ?? ""}|${selection.stackKey ?? ""}|${selection.detailId ?? ""}`;

  return (
    <TimeframeQueryProvider>
      <div
        className="map-v2-layout"
        data-panel-collapsed={panelCollapsed ? "true" : undefined}
        style={{ "--map-timeline-h": `${timeline.height}px` } as CSSProperties}
      >
        <div ref={insetProbeRef} className="map-v2-inset-probe" aria-hidden />
        {/* Both frames are always laid out, as CSS shows one or the other; the views go in the one on screen. */}
        <MapPanel collapsed={panelCollapsed} onToggle={togglePanel} contentKey={contentKey}>
          {layout === "panel" && panelContent}
        </MapPanel>
        <MapSheet expanded={sheetExpanded} onExpandedChange={setSheetExpanded} onClose={clear} contentKey={contentKey}>
          {layout === "sheet" && panelContent}
        </MapSheet>
        {insetLeft != null && (
          <MapV2
            offset={{ left: insetLeft, bottom: timeline.open ? timeline.height : 0 }}
            selection={selection.mapSelection}
            onSelect={onSelect}
            fitTo={fitTo}
          >
            <Timeline onHeightChange={onTimelineHeightChange} insetStart={panelCollapsed ? PANEL_TOGGLE_CLEARANCE : 0} />
          </MapV2>
        )}
      </div>
    </TimeframeQueryProvider>
  );
}
