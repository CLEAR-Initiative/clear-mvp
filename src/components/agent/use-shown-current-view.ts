"use client";

import { usePathname } from "next/navigation";
import { useFeatureEnabled } from "~/components/feature-flags-provider";
import { useDisplayedCurrentView, type DisplayedCurrentView } from "~/lib/agent-current-view";

/**
 * The Current view as the user is shown it, or null while none is sent with
 * turns (agent_clear_data off): the drawer never shows context, or suggests
 * questions about the screen, that the CLEAR Agent isn't told.
 */
export function useShownCurrentView(): DisplayedCurrentView | null {
  const sendsCurrentView = useFeatureEnabled("agent_clear_data");
  const view = useDisplayedCurrentView(usePathname() ?? "");
  return sendsCurrentView ? view : null;
}
