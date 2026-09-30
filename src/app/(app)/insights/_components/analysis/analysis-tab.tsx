"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Center, Loader, Select } from "@mantine/core";
import { api } from "~/trpc/react";
import { useTeamCountry } from "~/hooks/use-team-country";
import { useTeam } from "~/providers/team-provider";
import { pickCountry } from "~/lib/analysis-view";
import { canManageAnalyses } from "~/lib/roles";
import { AnalysisDetail, scopeKey, type AnalysisScopeRef } from "./analysis-detail";
import { AnalysisHome } from "./analysis-home";
import { NewAnalysisModal } from "./new-analysis-modal";
import { Notice } from "./notice";

/**
 * Insights -> Analysis (clear-api ADR-0007). Lands on the list of analyses for
 * the selected country: the country default plus the team's created ones over
 * districts. Gated by `analysis_v2` in the Insights page.
 */
export function AnalysisTab() {
  const t = useTranslations("analysis");
  const { countries: teamCountries, countryId: workingId, isLoading: teamLoading } = useTeamCountry();
  const { activeTeamId } = useTeam();
  const me = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const canManage = canManageAnalyses(me.data?.user?.role) && !!activeTeamId;

  const [picked, setPicked] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
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
      // Keep polling while a created analysis waits for its first run.
      refetchInterval: (q) => (q.state.data?.created.some((c) => !c.generatedAt) ? 30_000 : false),
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
  if (!country) return <Notice text={t("noCountry")} />;

  const refs: AnalysisScopeRef[] = [
    { kind: "country", countryId: country.id, countryName: country.name },
    ...created.map((c) => ({ kind: "created" as const, countryId: country.id, countryName: country.name, created: c })),
  ];
  const open = openKey ? refs.find((r) => scopeKey(r) === openKey) : undefined;

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
          setOpenKey(null);
        }}
        data={options.map((c) => ({ value: c.id, label: c.name }))}
        data-testid="analysis-country"
      />
    ) : null;

  let view: React.ReactNode;
  if (open) {
    view = (
      <AnalysisDetail
        key={openKey}
        scope={open}
        onBack={() => setOpenKey(null)}
      />
    );
  } else if (openKey && scopes.isFetching) {
    // A just-created analysis, before the refreshed list includes it.
    view = (
      <Center mih="40vh">
        <Loader size="sm" />
      </Center>
    );
  } else {
    view = (
      <AnalysisHome
        countryId={country.id}
        countryName={country.name}
        country={scopes.data?.countries[0] ?? null}
        created={created}
        loading={scopes.isLoading}
        canCreate={canManage}
        canRemove={canManage}
        teamId={activeTeamId}
        selector={selector}
        onOpenCountry={() => setOpenKey(`country:${country.id}`)}
        onOpenCreated={(c) => setOpenKey(`created:${c.id}`)}
        onNew={() => setCreating(true)}
      />
    );
  }

  return (
    <>
      {view}
      {canManage && activeTeamId && (
        <NewAnalysisModal
          opened={creating}
          onClose={() => setCreating(false)}
          teamId={activeTeamId}
          countryId={country.id}
          countryName={country.name}
          existing={created}
          onCreated={(id) => {
            setCreating(false);
            setOpenKey(`created:${id}`);
          }}
          onOpenExisting={(c) => {
            setCreating(false);
            setOpenKey(`created:${c.id}`);
          }}
        />
      )}
    </>
  );
}
