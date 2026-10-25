"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Center, Loader, Select, Stack } from "@mantine/core";
import { api } from "~/trpc/react";
import { useTeamCountry } from "~/hooks/use-team-country";
import { useTeam } from "~/providers/team-provider";
import { pickCountry } from "~/lib/analysis-view";
import { canManageAnalyses } from "~/lib/roles";
import type { CreatedAnalysis } from "~/server/api/mappers/analysis";
import { AnalysisDetail, scopeKey, type AnalysisScopeRef } from "./analysis-detail";
import { AnalysisHome } from "./analysis-home";
import { NewAnalysisModal } from "./new-analysis-modal";
import { Notice } from "./notice";

/** What the page is showing. */
type Opened = { kind: "country" } | { kind: "created"; created: CreatedAnalysis };

/**
 * Analysis (clear-api ADR-0007), the nav item at /analysis. Lands on the list
 * of analyses for the selected country: the country default plus the team's
 * created ones over districts.
 */
export function AnalysisTab() {
  const t = useTranslations("analysis");
  const { countries: teamCountries, countryId: workingId, isLoading: teamLoading } = useTeamCountry();
  const { activeTeamId, teams } = useTeam();
  const teamId = activeTeamId ?? teams?.find((t) => t.id)?.id ?? null;
  const me = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  // Create is part of the flow for every signed-in role. Removing one, and
  // changing how often it updates, stays with an admin or a team analyst.
  const canManage =
    canManageAnalyses(me.data?.user?.role, me.data?.user?.teamMemberships) && !!teamId;

  const [picked, setPicked] = useState<string | null>(null);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [creating, setCreating] = useState(false);

  // An unscoped team monitors globally: offer every country.
  const allCountries = api.situationAnalysis.countries.useQuery(undefined, {
    enabled: !teamLoading && teamCountries.length === 0,
    staleTime: Infinity,
  });
  const options = useMemo(
    () => (teamCountries.length > 0 ? teamCountries : (allCountries.data ?? [])),
    [teamCountries, allCountries.data],
  );
  const country = pickCountry(options, picked, workingId);
  const scopeLoading = teamLoading || (teamCountries.length === 0 && allCountries.isLoading);

  const scopes = api.analysis.scopes.useQuery(
    { teamId: activeTeamId ?? null, countries: country ? [{ id: country.id, name: country.name }] : [] },
    {
      enabled: !!country,
      staleTime: 60_000,
      refetchInterval: (q) => {
        const rows = q.state.data?.created ?? [];
        const pendingMissing = opened?.kind === "created" && !rows.some((c) => c.id === opened.created.id);
        return pendingMissing || rows.some((c) => !c.generatedAt) ? 30_000 : false;
      },
    },
  );
  const created = useMemo(
    // A null country means the server could not look up its areas: show it in
    // every country's list rather than hide it.
    () => (scopes.data?.created ?? []).filter((c) => c.countryId === country?.id || c.countryId === null),
    [scopes.data, country?.id],
  );

  if (scopeLoading) {
    return (
      <Center mih="40vh">
        <Loader size="sm" />
      </Center>
    );
  }
  if (!country) {
    return <Notice text={t("noCountry")} />;
  }

  // A just-created analysis is opened from the form. Once the list refetch
  // includes it, that row wins so the window and cadence match the server.
  const openedScope: AnalysisScopeRef | null =
    opened?.kind === "country"
      ? { kind: "country", countryId: country.id, countryName: country.name }
      : opened?.kind === "created"
        ? {
            kind: "created",
            countryId: country.id,
            countryName: country.name,
            created: created.find((c) => c.id === opened.created.id) ?? opened.created,
          }
        : null;

  const selector =
    options.length > 1 ? (
      <Select
        size="xs"
        w={200}
        searchable
        allowDeselect={false}
        aria-label={t("country")}
        value={country.id}
        onChange={(id) => {
          if (!id) return;
          setPicked(id);
          setOpened(null);
        }}
        data={options.map((c) => ({ value: c.id, label: c.name }))}
        data-testid="analysis-country"
      />
    ) : null;

  let view: ReactNode;
  if (openedScope) {
    view = (
      <AnalysisDetail
        key={scopeKey(openedScope)}
        scope={openedScope}
        onBack={() => setOpened(null)}
      />
    );
  } else {
    view = (
      <Stack gap={16}>
        <AnalysisHome
          countryId={country.id}
          countryName={country.name}
          country={scopes.data?.countries[0] ?? null}
          created={created}
          loading={scopes.isLoading}
          canCreate
          canRemove={canManage}
          teamId={teamId}
          selector={selector}
          onOpenCountry={() => setOpened({ kind: "country" })}
          onOpenCreated={(c) => setOpened({ kind: "created", created: c })}
          onNew={() => setCreating(true)}
        />
      </Stack>
    );
  }

  return (
    <>
      {view}
      <NewAnalysisModal
        opened={creating}
        onClose={() => setCreating(false)}
        teamId={teamId}
        countryId={country.id}
        countryName={country.name}
        existing={created}
        onCreated={(createdAnalysis) => {
          setCreating(false);
          setOpened({ kind: "created", created: createdAnalysis });
        }}
        onOpenExisting={(c) => {
          setCreating(false);
          setOpened({ kind: "created", created: c });
        }}
      />
    </>
  );
}
