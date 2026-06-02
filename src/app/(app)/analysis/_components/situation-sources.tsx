import { IconArrowUpRight } from "@tabler/icons-react";
import type {
  SaSource,
  SaSources,
} from "~/server/api/fixtures/situation-analysis";
import { SecHead } from "./sec-head";

function SourceCard({ s }: { s: SaSource }) {
  return (
    <div className="source-card">
      <div>
        <h3 className="sname">{s.name}</h3>
      </div>
      <div className="stype">{s.type}</div>
      <a
        className="source-link"
        href="#"
        onClick={(e) => e.preventDefault()}
      >
        <IconArrowUpRight size={13} />
        {s.link}
      </a>
      <p className="source-desc">{s.desc}</p>
    </div>
  );
}

/** Situation Analysis → Sources sub-view. */
export function SituationSources({ sources }: { sources: SaSources }) {
  return (
    <div>
      <SecHead>Primary Sources — Lebanon</SecHead>
      <div className="source-grid">
        {sources.primary.map((s, i) => (
          <SourceCard key={i} s={s} />
        ))}
      </div>
      <SecHead>Framework & Methodology</SecHead>
      <div className="source-grid">
        {sources.framework.map((s, i) => (
          <SourceCard key={i} s={s} />
        ))}
      </div>
    </div>
  );
}
