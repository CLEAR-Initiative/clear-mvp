"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  // The query the reader just left, so Back wins before the URL updates.
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Two keys, on purpose. `analysis` is an automation id from the scopes list.
  // `automation` is the previous name for that same id. `country` is a country
  // location id. Neither is a generated analysis id.
  const analysisParam = searchParams.get("analysis") ?? searchParams.get("automation");
  const countryParam = searchParams.get("country");
  const analysisKey = analysisParam ? `analysis:${analysisParam}` : null;
  const countryKey = countryParam ? `country:${countryParam}` : null;
  const activeKey = analysisKey ?? countryKey;

  const writeQuery = (next: { analysis?: string; country?: string } | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("analysis");
    params.delete("automation");
    params.delete("country");
    if (next?.analysis) params.set("analysis", next.analysis);
    if (next?.country) params.set("country", next.country);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const openCreated = (createdAnalysis: CreatedAnalysis) => {
    setDismissedKey(null);
    setOpened({ kind: "created", created: createdAnalysis });
    writeQuery({ analysis: createdAnalysis.id });
  };

  const closeOpened = () => {
    setOpened(null);
    if (activeKey) setDismissedKey(activeKey);
    writeQuery(null);
  };

  // Browser Back drops the query without going through the on-screen Back button.
  useEffect(() => {
    if (analysisParam) return;
    setOpened((current) => (current?.kind === "created" ? null : current));
  }, [analysisParam]);
  useEffect(() => {
    if (countryParam) return;
    setOpened((current) => (current?.kind === "country" ? null : current));
  }, [countryParam]);
  // A shared link that still says automation= opens, then the address bar
  // shows analysis= for the same id.
  useEffect(() => {
    const legacy = searchParams.get("automation");
    if (!legacy || searchParams.get("analysis")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("automation");
    params.set("analysis", legacy);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  // An unscoped team monitors globally: offer every country.
  const allCountries = api.situationAnalysis.countries.useQuery(undefined, {
    enabled: !teamLoading && teamCountries.length === 0,
    staleTime: Infinity,
  });
  const options = useMemo(
    () => (teamCountries.length > 0 ? teamCountries : (allCountries.data ?? [])),
    [teamCountries, allCountries.data],
  );
  // A country query selects that country. An automation query does not.
  const countryFromUrl =
    !analysisParam && countryParam && dismissedKey !== countryKey && options.some((o) => o.id === countryParam)
      ? countryParam
      : null;
  const country = pickCountry(options, countryFromUrl ?? picked, workingId);
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
  // A failed country list is not "no country assigned". Stay on the error
  // until the request succeeds; an empty list still uses the empty copy.
  if (teamCountries.length === 0 && allCountries.isError) {
    return <Notice text={t("error")} />;
  }
  if (!country) {
    return <Notice text={t("noCountry")} />;
  }
  if (scopes.isError) {
    return <Notice text={t("error")} />;
  }
  // The id is only unknown once the scopes list has arrived. Until then a reload
  // stays on the loader, not a flash of the list.
  const followAutomation = !!analysisKey && dismissedKey !== analysisKey;
  const linked = followAutomation ? (scopes.data?.created.find((c) => c.id === analysisParam) ?? null) : null;
  // The scopes list already names the analysis's country. Select it so the map
  // and the list behind Back match that analysis, not the working country.
  const linkedCountry = linked?.countryId ? options.find((o) => o.id === linked.countryId) : undefined;
  if (linkedCountry && linkedCountry.id !== country.id) {
    setPicked(linkedCountry.id);
  }
  if (analysisParam && !scopes.data) {
    return (
      <Center mih="40vh">
        <Loader size="sm" />
      </Center>
    );
  }

  // A just-created analysis is opened from the form. Once the list refetch
  // includes it, that row wins so the window and cadence match the server.
  // An automation query uses that same list row; it does not keep a second id.
  const localCreated = opened?.kind === "created" ? opened.created : null;
  const automationUnknown = followAutomation && !!scopes.data && !linked && localCreated?.id !== analysisParam;
  const openedCreated = automationUnknown ? null : (linked ?? localCreated);
  const showCountry = !followAutomation && (!!countryFromUrl || opened?.kind === "country");
  const openedScope: AnalysisScopeRef | null = openedCreated
    ? {
        kind: "created",
        countryId: country.id,
        countryName: country.name,
        created: created.find((c) => c.id === openedCreated.id) ?? openedCreated,
      }
    : showCountry
      ? { kind: "country", countryId: country.id, countryName: country.name }
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
          closeOpened();
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
        onBack={closeOpened}
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
          onOpenCountry={() => {
            setDismissedKey(null);
            setOpened({ kind: "country" });
            writeQuery({ country: country.id });
          }}
          onOpenCreated={openCreated}
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
          openCreated(createdAnalysis);
        }}
        onOpenExisting={(c) => {
          setCreating(false);
          openCreated(c);
        }}
      />
    </>
  );
}
