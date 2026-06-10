import { Menu } from "@mantine/core";
import { IconChevronDown, IconDownload } from "@tabler/icons-react";
import type { SaCrisis } from "~/server/api/fixtures/situation-analysis";

interface CrisisBarCountry {
  id: string;
  name: string;
}

/**
 * Crisis identity bar above the primary tabs. The country selector is driven by
 * the `situationAnalysis.countries` endpoint; the Export button is still a
 * visual stub (no export pipeline yet).
 */
export function CrisisBar({
  crisis,
  countries,
  onSelectCountry,
  isSampleData,
}: {
  crisis: SaCrisis;
  countries: CrisisBarCountry[];
  onSelectCountry: (name: string) => void;
  isSampleData: boolean;
}) {
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
        {isSampleData && (
          <span
            className="meta-chip sample"
            title="Curated hard-coded sample data — not from the live pipeline"
          >
            <span className="d" />
            Sample data
          </span>
        )}
      </div>
      <div className="crisis-actions">
        <Menu shadow="md" width={220} position="bottom-end">
          <Menu.Target>
            <button type="button" className="crisis-select">
              <span className="flag-dot" />
              {crisis.country}
              <IconChevronDown size={13} className="car" />
            </button>
          </Menu.Target>
          <Menu.Dropdown>
            {countries.length === 0 && (
              <Menu.Item disabled>No countries available</Menu.Item>
            )}
            {countries.map((c) => (
              <Menu.Item
                key={c.id}
                onClick={() => onSelectCountry(c.name)}
                data-active={c.name === crisis.country || undefined}
              >
                {c.name}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
        <button type="button" className="btn-export">
          <IconDownload size={15} />
          Export
        </button>
      </div>
    </header>
  );
}
