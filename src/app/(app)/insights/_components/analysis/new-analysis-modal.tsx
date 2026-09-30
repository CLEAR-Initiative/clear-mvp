"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useFormatter, useTranslations } from "next-intl";
import {
  Alert,
  Box,
  Button,
  Combobox,
  Group,
  Modal,
  Pill,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  useCombobox,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconSearch } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { CreatedAnalysis } from "~/server/api/mappers/analysis";
import type { MapRegion } from "~/components/map/crisis-map";
import { resolveCountryConfig } from "~/lib/constants/country-config";
import {
  ANALYSIS_CADENCES,
  MAX_CREATED_LOCATIONS,
  addArea,
  containsPoint,
  createdWindowStart,
  sameLocations,
  scopeLabel,
  type AnalysisCadence,
  type PickableArea,
} from "~/lib/analysis-view";

const CrisisMap = dynamic(() => import("~/components/map/crisis-map").then((m) => m.CrisisMap), {
  ssr: false,
  loading: () => <Box style={{ width: "100%", height: "100%", background: "var(--color-bg-muted)" }} />,
});

/** Options shown per group while searching; typing narrows the rest. */
const MAX_OPTIONS = 40;

interface Area extends PickableArea {
  name: string;
  stateName: string | null;
  geometry: unknown;
}

/**
 * Create an analysis over states and/or districts of a country: search to add
 * them, or click districts on the map. It becomes a rolling analysis the
 * pipeline keeps current at the chosen frequency.
 */
export function NewAnalysisModal({
  opened,
  onClose,
  teamId,
  countryId,
  countryName,
  existing,
  onCreated,
  onOpenExisting,
}: {
  opened: boolean;
  onClose: () => void;
  teamId: string;
  countryId: string;
  countryName: string;
  existing: CreatedAnalysis[];
  onCreated: (automationId: string) => void;
  onOpenExisting: (created: CreatedAnalysis) => void;
}) {
  const t = useTranslations("analysis.create");
  const tc = useTranslations("analysis.cadence");
  const format = useFormatter();
  const utils = api.useUtils();
  const [selected, setSelected] = useState<string[]>([]);
  const [cadence, setCadence] = useState<AnalysisCadence>("weekly");
  const [query, setQuery] = useState("");
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });

  const opts = { enabled: opened, staleTime: Infinity, refetchOnWindowFocus: false } as const;
  const statesQuery = api.locations.getAdminBoundaries.useQuery({ level: 1, countryId }, opts);
  const districtsQuery = api.locations.getAdminBoundaries.useQuery({ level: 2, countryId }, opts);
  const loading = statesQuery.isLoading || districtsQuery.isLoading;

  const { states, districts, byId } = useMemo(() => {
    const byName = (a: Area, b: Area) => a.name.localeCompare(b.name);
    const states: Area[] = (statesQuery.data ?? [])
      .map((s) => ({ id: s.id, level: 1 as const, stateId: null, name: s.name, stateName: null, geometry: s.geometry }))
      .sort(byName);
    const districts: Area[] = (districtsQuery.data ?? [])
      .map((d) => ({
        id: d.id,
        level: 2 as const,
        stateId: d.parent?.id ?? null,
        name: d.name,
        stateName: d.parent?.name ?? null,
        geometry: d.geometry,
      }))
      .sort(byName);
    return { states, districts, byId: new Map<string, Area>([...states, ...districts].map((a) => [a.id, a])) };
  }, [statesQuery.data, districtsQuery.data]);

  const picked = selected.map((id) => byId.get(id)).filter((a): a is Area => !!a);
  const full = selected.length >= MAX_CREATED_LOCATIONS;

  const add = (id: string) => {
    const area = byId.get(id);
    if (area && !full) setSelected((s) => addArea(s, area, byId));
  };
  const remove = (id: string) => setSelected((s) => s.filter((x) => x !== id));

  // Search: states and districts matching the query, minus what is already covered.
  const q = query.trim().toLowerCase();
  const available = (a: Area) =>
    !selected.includes(a.id) && !(a.stateId && selected.includes(a.stateId)) && (!q || a.name.toLowerCase().includes(q));
  const stateOptions = states.filter(available).slice(0, MAX_OPTIONS);
  const districtOptions = districts.filter(available).slice(0, MAX_OPTIONS);

  // Map: a click toggles the district under it.
  const onMapClick = ({ lng, lat }: { lng: number; lat: number }) => {
    const hit = districts.find((d) => containsPoint(d.geometry, [lng, lat]));
    if (!hit) return;
    if (selected.includes(hit.id)) remove(hit.id);
    else add(hit.id);
  };

  const regions = useMemo<MapRegion[]>(
    () =>
      picked
        .filter((a) => a.geometry)
        .map((a) => ({ id: a.id, geometry: a.geometry as MapRegion["geometry"], severity: "high" as const, title: a.name })),
    [picked],
  );
  const boundaries = useMemo(
    () => districts.map((d) => ({ id: d.id, name: d.name, geometry: d.geometry })),
    [districts],
  );
  const config = resolveCountryConfig(countryName);

  const name = scopeLabel(
    picked.map((a) => ({
      id: a.id,
      name: a.name,
      parent: null,
      ancestors: [
        { id: countryId, name: countryName, level: 0 },
        ...(a.stateId && a.stateName ? [{ id: a.stateId, name: a.stateName, level: 1 }] : []),
      ],
    })),
  );
  const duplicate = existing.find((c) => sameLocations(c.locationIds, selected));

  const create = api.analysis.create.useMutation({
    onSuccess: async (res, input) => {
      await utils.analysis.scopes.invalidate();
      // The team already had these areas (e.g. another member created them).
      if (res.existing) notifications.show({ message: t("existing") });
      // "On request" could not be set up (first version not requested, or the
      // switch-off failed): the server leaves it weekly, so say so.
      else if (input.cadence === "manual" && res.cadence === "weekly")
        notifications.show({ color: "yellow", message: t("manualFallback") });
      reset();
      onCreated(res.id);
    },
  });

  function reset() {
    setSelected([]);
    setCadence("weekly");
    setQuery("");
    create.reset();
  }
  const close = () => {
    reset();
    onClose();
  };

  const since = format.dateTime(new Date(createdWindowStart()), { day: "numeric", month: "short", year: "numeric" });

  return (
    <Modal opened={opened} onClose={close} title={<Text fw={700}>{t("title", { country: countryName })}</Text>} size="xl">
      <Stack gap={16}>
        <Combobox
          store={combobox}
          onOptionSubmit={(id) => {
            add(id);
            setQuery("");
          }}
        >
          <Combobox.Target>
            <TextInput
              label={t("areas")}
              description={t("areasHint", { max: MAX_CREATED_LOCATIONS })}
              placeholder={loading ? t("loading") : t("search")}
              leftSection={<IconSearch size={14} />}
              value={query}
              disabled={loading || full}
              onChange={(e) => {
                setQuery(e.currentTarget.value);
                combobox.openDropdown();
                combobox.updateSelectedOptionIndex();
              }}
              onClick={() => combobox.openDropdown()}
              onFocus={() => combobox.openDropdown()}
              onBlur={() => combobox.closeDropdown()}
              data-testid="analysis-create-search"
            />
          </Combobox.Target>
          <Combobox.Dropdown>
            <Combobox.Options mah={280} style={{ overflowY: "auto" }}>
              {stateOptions.length === 0 && districtOptions.length === 0 ? (
                <Combobox.Empty>{t("noMatch")}</Combobox.Empty>
              ) : (
                <>
                  {stateOptions.length > 0 && (
                    <Combobox.Group label={t("states")}>
                      {stateOptions.map((s) => (
                        <Combobox.Option key={s.id} value={s.id}>
                          <Text style={{ fontSize: 13 }}>{s.name}</Text>
                        </Combobox.Option>
                      ))}
                    </Combobox.Group>
                  )}
                  {districtOptions.length > 0 && (
                    <Combobox.Group label={t("districts")}>
                      {districtOptions.map((d) => (
                        <Combobox.Option key={d.id} value={d.id}>
                          <Group gap={6} wrap="nowrap">
                            <Text style={{ fontSize: 13 }}>{d.name}</Text>
                            {d.stateName && (
                              <Text c="var(--color-text-muted)" style={{ fontSize: 12 }}>
                                {d.stateName}
                              </Text>
                            )}
                          </Group>
                        </Combobox.Option>
                      ))}
                    </Combobox.Group>
                  )}
                </>
              )}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>

        <Box>
          <Box style={{ height: 300, border: "1px solid var(--color-border)" }} data-testid="analysis-create-map">
            {opened && (
              <CrisisMap
                center={config?.center ?? [10, 20]}
                zoom={4.5}
                className="w-full h-full"
                focusCountryPCode={config?.pCode}
                focusCountryName={countryName}
                regions={regions}
                adminBoundaries={boundaries}
                adminBoundaryLevel={2}
                locationPickActive
                onMapClick={onMapClick}
              />
            )}
          </Box>
          <Text c="var(--color-text-muted)" mt={6} style={{ fontSize: 12 }}>
            {t("mapHint")}
          </Text>
        </Box>

        <Box>
          <Text fw={500} mb={6} style={{ fontSize: 14 }}>
            {t("selected", { count: picked.length, max: MAX_CREATED_LOCATIONS })}
          </Text>
          {picked.length === 0 ? (
            <Text c="var(--color-text-muted)" style={{ fontSize: 13 }}>
              {t("nothingSelected")}
            </Text>
          ) : (
            <Group gap={6} data-testid="analysis-create-pills">
              {picked.map((a) => (
                <Pill
                  key={a.id}
                  size="md"
                  withRemoveButton
                  onRemove={() => remove(a.id)}
                  removeButtonProps={{ "aria-label": t("removeArea", { name: a.name }) }}
                  data-testid={`analysis-create-pill-${a.id}`}
                >
                  {a.level === 1 ? t("wholeState", { name: a.name }) : a.stateName ? `${a.name}, ${a.stateName}` : a.name}
                </Pill>
              ))}
            </Group>
          )}
        </Box>

        <Box>
          <Text fw={500} mb={6} style={{ fontSize: 14 }}>
            {t("cadence")}
          </Text>
          <SegmentedControl
            value={cadence}
            onChange={(v) => setCadence(v as AnalysisCadence)}
            data={ANALYSIS_CADENCES.map((c) => ({ value: c, label: tc(c) }))}
            data-testid="analysis-create-cadence"
          />
        </Box>

        {duplicate ? (
          <Alert color="yellow" data-testid="analysis-create-duplicate">
            <Group justify="space-between" wrap="nowrap">
              <Text style={{ fontSize: 13 }}>{t("duplicate", { name: duplicate.name })}</Text>
              <Button
                size="xs"
                variant="default"
                onClick={() => {
                  reset();
                  onOpenExisting(duplicate);
                }}
              >
                {t("openExisting")}
              </Button>
            </Group>
          </Alert>
        ) : (
          picked.length > 0 && (
            <Box p={14} style={{ background: "var(--color-bg-muted)" }} data-testid="analysis-create-summary">
              <Text fw={700} style={{ fontSize: 14 }}>
                {name}
              </Text>
              <Text c="var(--color-text-secondary)" mt={4} style={{ fontSize: 13 }}>
                {t("summary", { since, cadence: tc(cadence).toLowerCase() })}
              </Text>
              <Text c="var(--color-text-muted)" mt={4} style={{ fontSize: 12 }}>
                {t("firstRun")}
              </Text>
            </Box>
          )
        )}

        {create.isError && (
          <Alert color="red" data-testid="analysis-create-error">
            {t("error")}
          </Alert>
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={close}>
            {t("cancel")}
          </Button>
          <Button
            color="dark"
            disabled={picked.length === 0 || !!duplicate}
            loading={create.isPending}
            onClick={() => create.mutate({ teamId, locationIds: selected, cadence })}
            data-testid="analysis-create-submit"
          >
            {t("submit")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
