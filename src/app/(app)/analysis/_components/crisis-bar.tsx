import { IconChevronDown, IconDownload } from "@tabler/icons-react";
import type { SaCrisis } from "~/server/api/fixtures/situation-analysis";

/**
 * Crisis identity bar above the primary tabs.
 * The country selector and Export button are visual stubs for now —
 * there is no countries endpoint or export pipeline yet.
 */
export function CrisisBar({ crisis }: { crisis: SaCrisis }) {
  return (
    <header className="crisis-bar">
      <div className="crisis-id">
        <span className="crisis-dot" />
        <span className="crisis-name">{crisis.name}</span>
        <span className="crisis-sub">Situation Analysis</span>
        <span className="crisis-divider" />
        <span className="meta-chip">
          <span className="d" />
          {crisis.date}
        </span>
        <span className="meta-chip">{crisis.framework}</span>
      </div>
      <div className="crisis-actions">
        <button type="button" className="crisis-select">
          <span className="flag-dot" />
          {crisis.country}
          <IconChevronDown size={13} className="car" />
        </button>
        <button type="button" className="btn-export">
          <IconDownload size={15} />
          Export
        </button>
      </div>
    </header>
  );
}
