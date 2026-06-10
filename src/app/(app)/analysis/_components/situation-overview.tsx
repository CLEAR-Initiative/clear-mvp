import type { SituationAnalysis } from "~/server/api/fixtures/situation-analysis";
import { SecHead } from "./sec-head";
import { BulletCard } from "./bullet-card";

/** Situation Analysis → Overview sub-view. */
export function SituationOverview({ data }: { data: SituationAnalysis }) {
  const c = data.crisis;
  const hasHazards = data.hazards.current.length > 0 || data.hazards.precrisis.length > 0;
  const hasDisplacement =
    data.displacement.push.length > 0 || data.displacement.return.length > 0;

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card blue">
          <div className="stat-label">Displaced</div>
          <div className="stat-value mono">{c.displaced.value}</div>
          <div className="stat-sub">{c.displaced.label}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Affected</div>
          <div className="stat-value mono">{c.affected.value}</div>
          <div className="stat-sub">{c.affected.label}</div>
        </div>
      </div>

      {c.summary && (
        <>
          <div style={{ height: 24 }} />
          <div className="summary-card">
            <div className="summary-tag">
              <span className="ldot" />
              AI Situation Summary
            </div>
            <p className="summary-body">{c.summary}</p>
          </div>
        </>
      )}

      {data.contextRisks.length > 0 && (
        <>
          <SecHead>Context Risks</SecHead>
          <div className="risk-table">
            {data.contextRisks.map((r, i) => (
              <div className="risk-row" key={i}>
                <div className="risk-cat">{r.label}</div>
                <div className="risk-items">
                  {r.items.map((it, j) => (
                    <div className="risk-item" key={j}>
                      <span className="dash">—</span>
                      <span>{it}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {hasHazards && (
        <>
          <SecHead>Hazards & Pre-Crisis Vulnerabilities</SecHead>
          <div className="pair-grid">
            <BulletCard tone="red" label="Current Hazards" items={data.hazards.current} />
            <BulletCard
              tone="amber"
              label="Pre-Crisis Vulnerabilities"
              items={data.hazards.precrisis}
            />
          </div>
        </>
      )}

      {hasDisplacement && (
        <>
          <SecHead>Displacement</SecHead>
          <div className="pair-grid">
            <BulletCard tone="blue" label="Push Factors" items={data.displacement.push} />
            <BulletCard
              tone="green"
              label="Return Intentions"
              items={data.displacement.return}
            />
          </div>
        </>
      )}
    </div>
  );
}
