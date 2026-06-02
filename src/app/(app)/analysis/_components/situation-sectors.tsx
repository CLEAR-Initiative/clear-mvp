"use client";

import { useState } from "react";
import type { SaSector } from "~/server/api/fixtures/situation-analysis";
import { SecHead } from "./sec-head";
import { SevBadge } from "./sev-badge";

/** Situation Analysis → Sectors sub-view: list + detail. */
export function SituationSectors({ sectors }: { sectors: SaSector[] }) {
  const [sel, setSel] = useState<string | undefined>(
    () => sectors.find((s) => s.id === "health")?.id ?? sectors[0]?.id,
  );
  const sector = sectors.find((s) => s.id === sel) ?? sectors[0];
  if (!sector) return null;

  return (
    <div className="sectors-layout">
      <div className="sector-list">
        <div className="sector-list-head">
          <div className="t">Sectors</div>
          <div className="s">
            {sectors.length} sectors · select to view full analysis
          </div>
        </div>
        <div className="sector-col-head">
          <span>Sector</span>
          <span>Imp.</span>
          <span>Hum.</span>
          <span>Risk</span>
        </div>
        {sectors.map((s) => (
          <button
            type="button"
            key={s.id}
            className={"sector-row" + (s.id === sel ? " active" : "")}
            onClick={() => setSel(s.id)}
          >
            <span className="sector-name">
              <span className="sector-code">{s.code}</span>
              <span className="sector-title">{s.name}</span>
            </span>
            <SevBadge level={s.impact} />
            <SevBadge level={s.humanitarian} />
            <SevBadge level={s.atRisk} />
          </button>
        ))}
      </div>
      <SectorDetail sector={sector} />
    </div>
  );
}

function SectorDetail({ sector }: { sector: SaSector }) {
  const a = sector.assessment;
  const cols = [
    { key: "impact", label: "Impact", d: a.impact },
    { key: "humanitarian", label: "Humanitarian Conditions", d: a.humanitarian },
    { key: "atRisk", label: "At Risk", d: a.atRisk },
  ] as const;

  const { needs, interventions, coverage } = sector;

  return (
    <div className="sector-detail">
      <div className="detail-head">
        <div className="detail-code">{sector.code}</div>
        <div>
          <h2 className="detail-title">{sector.name}</h2>
          <div className="detail-meta">
            {needs.length} need{needs.length !== 1 ? "s" : ""} ·{" "}
            {interventions.length} intervention
            {interventions.length !== 1 ? "s" : ""} · {coverage.length} coverage
            entr{coverage.length !== 1 ? "ies" : "y"}
          </div>
        </div>
      </div>

      <SecHead>Severity Assessment</SecHead>
      <div className="assess-grid">
        {cols.map((col) => (
          <div className={"assess-card " + (col.d ? col.d.level : "none")} key={col.key}>
            <div className="assess-label">{col.label}</div>
            {col.d ? (
              <>
                <div className={"assess-badge " + col.d.level}>{col.d.level}</div>
                <div className="assess-list">
                  {col.d.items.map((it, i) => (
                    <div className="assess-item" key={i}>
                      <span className="d">·</span>
                      <span>{it}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="assess-item" style={{ color: "var(--ink-4)" }}>
                <span>Not assessed</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <SecHead>Top Needs</SecHead>
      <div>
        {needs.map((n, i) => (
          <div className="line-card need" key={i}>
            <span className="mk">→</span>
            <span>{n}</span>
          </div>
        ))}
      </div>

      <SecHead>Priority Interventions</SecHead>
      <div>
        {interventions.map((n, i) => (
          <div className="line-card" key={i}>
            <span className="mk">◦</span>
            <span>{n}</span>
          </div>
        ))}
      </div>

      <SecHead>Information Coverage & Gaps</SecHead>
      <div>
        {coverage.map((cv, i) => (
          <div className="cov-card" key={i}>
            <div className="cov-top">
              <div className="cov-dim">{cv.dim}</div>
              <div className="cov-score">
                <span className="cov-num">{cv.score}/10</span>
                <span className="cov-bar">
                  <i style={{ width: `${cv.score * 10}%` }} />
                </span>
              </div>
            </div>
            <div className="cov-gaps">
              {cv.items.map((it, j) => (
                <div className="cov-gap" key={j}>
                  <span className="d">·</span>
                  <span>{it}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
