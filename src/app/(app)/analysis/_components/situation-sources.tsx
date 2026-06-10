import { IconArrowUpRight } from "@tabler/icons-react";
import type {
  SaSource,
  SaSources,
} from "~/server/api/fixtures/situation-analysis";
import { SecHead } from "./sec-head";

function SourceCard({ s }: { s: SaSource }) {
  const isUrl = /^https?:\/\//.test(s.link);
  return (
    <div className="source-card">
      <div>
        <h3 className="sname">{s.name}</h3>
      </div>
      <div className="stype">{s.type}</div>
      {isUrl ? (
        <a
          className="source-link"
          href={s.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          <IconArrowUpRight size={13} />
          Visit source
        </a>
      ) : (
        s.link && (
          <span className="source-link">
            <IconArrowUpRight size={13} />
            {s.link}
          </span>
        )
      )}
      {s.desc && <p className="source-desc">{s.desc}</p>}
    </div>
  );
}

/** Situation Analysis → Sources sub-view. */
export function SituationSources({
  sources,
  country,
}: {
  sources: SaSources;
  country: string;
}) {
  return (
    <div>
      <SecHead>{`Primary Sources — ${country}`}</SecHead>
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
