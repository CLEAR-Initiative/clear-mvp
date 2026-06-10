import { IconLayoutGrid } from "@tabler/icons-react";
import type { SaActiveCrisis } from "~/server/api/fixtures/situation-analysis";

/** View 1 — "Active Crises" list for the selected country. */
export function CrisisList({
  country,
  crises,
}: {
  country: string;
  crises: SaActiveCrisis[];
}) {
  return (
    <div className="crisis-list">
      <div className="crisis-list-head">
        <div className="t">Active Crises</div>
        <div className="s">{country}</div>
      </div>
      {crises.length === 0 && (
        <div className="crisis-card" style={{ color: "var(--ink-4)", cursor: "default" }}>
          No active crises recorded for {country}.
        </div>
      )}
      {crises.map((c, i) => (
        <button type="button" className="crisis-card" key={i}>
          <span className="crisis-mk" />
          <div>
            <h3 className="crisis-ct">{c.title}</h3>
            <div className="crisis-bullets">
              {c.items.map((it, j) => (
                <div className="cb" key={j}>
                  <span className="d">·</span>
                  <span>{it}</span>
                </div>
              ))}
            </div>
            <div className="crisis-events">
              <IconLayoutGrid size={13} />
              {`${c.events} event${c.events !== 1 ? "s" : ""}`}
            </div>
          </div>
          <span className={`crisis-sev ${c.severity}`}>
            {c.severity.toUpperCase()}
          </span>
        </button>
      ))}
    </div>
  );
}
