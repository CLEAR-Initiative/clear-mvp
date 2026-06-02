"use client";

import { useState } from "react";
import { Center, Loader, Text } from "@mantine/core";
import { api } from "~/trpc/react";
import { CrisisBar } from "./_components/crisis-bar";
import { CrisisList } from "./_components/crisis-list";
import { SituationOverview } from "./_components/situation-overview";
import { SituationSectors } from "./_components/situation-sectors";
import { SituationSources } from "./_components/situation-sources";
import "~/styles/situation-analysis.css";

type PrimaryTab = "crisis" | "situation";
type SubTab = "overview" | "sectors" | "sources";

const SUB_TABS: { id: SubTab; label: string; live?: boolean }[] = [
  { id: "overview", label: "Overview", live: true },
  { id: "sectors", label: "Sectors" },
  { id: "sources", label: "Sources" },
];

export default function AnalysisPage() {
  // Default primary tab = Situation Analysis (per spec).
  const [ptab, setPtab] = useState<PrimaryTab>("situation");
  const [tab, setTab] = useState<SubTab>("overview");

  const { data, isLoading, isError } = api.situationAnalysis.get.useQuery(
    undefined,
  );

  return (
    <div className="sa-module">
      {data && <CrisisBar crisis={data.crisis} />}

      <div className="ptabs">
        <button
          type="button"
          className={"ptab" + (ptab === "crisis" ? " active" : "")}
          onClick={() => setPtab("crisis")}
        >
          Crisis
        </button>
        <button
          type="button"
          className={"ptab" + (ptab === "situation" ? " active" : "")}
          onClick={() => setPtab("situation")}
        >
          Situation Analysis
        </button>
      </div>

      <div className="scroll">
        <div className="page">
          {isLoading && (
            <Center mih="40vh">
              <Loader color="accent" />
            </Center>
          )}

          {isError && (
            <Center mih="40vh">
              <Text c="var(--ink-3)">
                Unable to load the situation analysis. Please try again.
              </Text>
            </Center>
          )}

          {data &&
            (ptab === "crisis" ? (
              <CrisisList
                country={data.crisis.country}
                crises={data.activeCrises}
              />
            ) : (
              <>
                <div className="segmented">
                  {SUB_TABS.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      className={"seg-btn" + (tab === t.id ? " active" : "")}
                      onClick={() => setTab(t.id)}
                    >
                      {t.label}
                      {t.live && <span className="live-pill">LIVE</span>}
                    </button>
                  ))}
                </div>

                {tab === "overview" && <SituationOverview data={data} />}
                {tab === "sectors" && <SituationSectors sectors={data.sectors} />}
                {tab === "sources" && <SituationSources sources={data.sources} />}
              </>
            ))}
        </div>
      </div>
    </div>
  );
}
