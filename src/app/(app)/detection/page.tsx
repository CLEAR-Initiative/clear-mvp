"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Box, Tabs, Button, Group, Pagination, Switch, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import type { MapMarker } from "~/components/map/crisis-map";
import { dateOptions, parseDateFilter } from "~/lib/constants/country-config";
import { useLocations } from "~/hooks/use-locations";
import { alertsToMarkers, alertsToRegions, eventsToMarkers, eventsToRegions, signalsToMarkers } from "../map/_components/map-markers-data";
import { PageHeader, FilterBar } from "~/components/ui";

import { DetectionKpiRow } from "~/components/detection/detection-kpi-row";
import { LiveAlertsTab } from "./_components/live-alerts-tab";
import { HistoryTab } from "./_components/history-tab";
import { EventsTab } from "./_components/events-tab";
import { SignalsTab } from "./_components/signals-tab";
import { CreateSignalModal } from "~/components/create-signal-modal";

const PAGE_SIZE = 25;

export default function DetectionPage() {
  const [activeTab, setActiveTab] = useState<string | null>("live");
  const [selectedCountry, setSelectedCountry] = useState("Sudan");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [selectedDate, setSelectedDate] = useState(dateOptions[0] ?? "Last 30 days");
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const [includeDummy, setIncludeDummy] = useState(false);

  // Per-tab page state (1-based to match Mantine's <Pagination>).
  const [alertsPageNum, setAlertsPageNum] = useState(1);
  const [eventsPageNum, setEventsPageNum] = useState(1);
  const [signalsPageNum, setSignalsPageNum] = useState(1);

  const { activeTeamId } = useTeam();
  const { countries, getRegions, getCenter, getZoom, getLocationId } = useLocations();

  // Resolve filters server-side: locationId from country/region, date range
  // from the FilterBar preset. The API takes care of the rest (severity
  // ordering, scoping to team, etc.).
  const selectedLocationId = useMemo(() => {
    if (selectedRegion !== "All Regions") return getLocationId(selectedRegion);
    return getLocationId(selectedCountry);
  }, [selectedCountry, selectedRegion, getLocationId]);

  const dateRange = useMemo(() => parseDateFilter(selectedDate), [selectedDate]);
  const fromIso = useMemo(() => dateRange.start.toISOString(), [dateRange]);
  const toIso = useMemo(() => dateRange.end.toISOString(), [dateRange]);

  // Reset page → 1 whenever the underlying filter changes — otherwise the
  // user lands on page 5 of a freshly-narrowed result set.
  useEffect(() => setAlertsPageNum(1), [selectedLocationId, fromIso, toIso, includeDummy, activeTeamId]);
  useEffect(() => setEventsPageNum(1), [selectedLocationId, fromIso, toIso, includeDummy, activeTeamId]);
  useEffect(() => setSignalsPageNum(1), [selectedLocationId, fromIso, toIso, includeDummy, activeTeamId]);

  const sharedFilter = {
    teamId: activeTeamId,
    locationId: selectedLocationId ?? undefined,
    from: fromIso,
    to: toIso,
    includeDummy,
  };

  const alertsPageQuery = api.alerts.alertsPage.useQuery(
    {
      ...sharedFilter,
      status: "published",
      orderBy: "SEVERITY_DESC",
      limit: PAGE_SIZE,
      offset: (alertsPageNum - 1) * PAGE_SIZE,
    },
    { enabled: activeTab === "live" },
  );
  const eventsPageQuery = api.alerts.eventsPage.useQuery(
    {
      ...sharedFilter,
      orderBy: "SEVERITY_DESC",
      limit: PAGE_SIZE,
      offset: (eventsPageNum - 1) * PAGE_SIZE,
    },
    { enabled: activeTab === "events" },
  );
  const signalsPageQuery = api.alerts.signalsPage.useQuery(
    {
      ...sharedFilter,
      orderBy: "PUBLISHED_DESC",
      limit: PAGE_SIZE,
      offset: (signalsPageNum - 1) * PAGE_SIZE,
    },
    { enabled: activeTab === "signals" },
  );

  // History tab keeps its existing unpaginated query for now — it shows a
  // mixed alerts/events/signals roll-up and isn't part of the "list of all"
  // pagination scope.
  const historyQuery = api.alerts.getAlerts.useQuery(
    { activeOnly: false, teamId: activeTeamId, includeDummy },
    { enabled: activeTab === "history" },
  );
  const historyEventsQuery = api.events.list.useQuery(
    { teamId: activeTeamId, includeDummy },
    { enabled: activeTab === "history" },
  );
  const historySignalsQuery = api.signals.list.useQuery(
    { teamId: activeTeamId, includeDummy },
    { enabled: activeTab === "history" },
  );

  const regions = getRegions(selectedCountry);

  const alerts = useMemo(() => alertsPageQuery.data?.items ?? [], [alertsPageQuery.data]);
  const filteredEvents = useMemo(() => eventsPageQuery.data?.items ?? [], [eventsPageQuery.data]);
  const filteredSignals = useMemo(() => signalsPageQuery.data?.items ?? [], [signalsPageQuery.data]);
  const historyAlerts = historyQuery.data?.alerts ?? [];

  const alertsTotalPages = Math.max(1, Math.ceil((alertsPageQuery.data?.totalCount ?? 0) / PAGE_SIZE));
  const eventsTotalPages = Math.max(1, Math.ceil((eventsPageQuery.data?.totalCount ?? 0) / PAGE_SIZE));
  const signalsTotalPages = Math.max(1, Math.ceil((signalsPageQuery.data?.totalCount ?? 0) / PAGE_SIZE));

  const mapMarkers: MapMarker[] = useMemo(() => alertsToMarkers(alerts), [alerts]);
  const mapRegions = useMemo(() => alertsToRegions(alerts), [alerts]);
  const eventMapMarkers: MapMarker[] = useMemo(
    () => eventsToMarkers(filteredEvents),
    [filteredEvents],
  );
  const eventMapRegions = useMemo(() => eventsToRegions(filteredEvents), [filteredEvents]);
  const signalMapMarkers: MapMarker[] = useMemo(
    () => signalsToMarkers(filteredSignals),
    [filteredSignals],
  );
  const mapCenter = useMemo<[number, number]>(() => getCenter(selectedCountry), [selectedCountry]);
  const mapZoom = useMemo(() => getZoom(selectedCountry), [selectedCountry]);

  const handleAlertCreated = useCallback(() => {
    void alertsPageQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box>
      <PageHeader
        title="Crisis Detection"
        subtitle="Detection"
        breadcrumbs={["CLEAR", "Detection"]}
        loading={alertsPageQuery.isLoading}
      >
        <FilterBar
          country={selectedCountry}
          onCountryChange={(v) => {
            setSelectedCountry(v);
            setSelectedRegion("All Regions");
          }}
          region={selectedRegion}
          onRegionChange={setSelectedRegion}
          countries={countries}
          regions={regions}
          date={selectedDate}
          onDateChange={setSelectedDate}
          dateOptions={dateOptions}
        />
        <Group gap={12}>
          <Group gap={6}>
            <Switch
              size="xs"
              checked={includeDummy}
              onChange={(e) => setIncludeDummy(e.currentTarget.checked)}
              color="gray"
            />
            <Text size="xs" c="#737373" style={{ fontSize: 11 }}>Demo data</Text>
          </Group>
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={openCreateModal}
            style={{ background: "#E85D3D", borderColor: "#E85D3D", fontSize: 13 }}
          >
            Create Signal
          </Button>
        </Group>
      </PageHeader>

      <Box p={24}>
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          mb={24}
          styles={{ tab: { fontSize: 13, fontWeight: 500 } }}
        >
          <Tabs.List>
            <Tabs.Tab value="live">Alerts</Tabs.Tab>
            <Tabs.Tab value="events">Events</Tabs.Tab>
            <Tabs.Tab value="signals">Signals</Tabs.Tab>
            <Tabs.Tab value="history">History</Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <DetectionKpiRow
          country={selectedCountry}
          alerts={alerts}
          events={filteredEvents}
          onNavigateToAlerts={() => setActiveTab("live")}
        />

        {activeTab === "live" && (
          <>
            <LiveAlertsTab
              alerts={alerts}
              alertsLoading={alertsPageQuery.isLoading}
              mapMarkers={mapMarkers}
              mapRegions={mapRegions}
              mapCenter={mapCenter}
              mapZoom={mapZoom}
            />
            <PaginationFooter
              page={alertsPageNum}
              total={alertsPageQuery.data?.totalCount ?? 0}
              totalPages={alertsTotalPages}
              pageSize={PAGE_SIZE}
              onChange={setAlertsPageNum}
            />
          </>
        )}

        {activeTab === "signals" && (
          <>
            <SignalsTab
              signals={filteredSignals}
              loading={signalsPageQuery.isLoading}
              mapMarkers={signalMapMarkers}
              mapCenter={mapCenter}
              mapZoom={mapZoom}
            />
            <PaginationFooter
              page={signalsPageNum}
              total={signalsPageQuery.data?.totalCount ?? 0}
              totalPages={signalsTotalPages}
              pageSize={PAGE_SIZE}
              onChange={setSignalsPageNum}
            />
          </>
        )}

        {activeTab === "history" && (
          <HistoryTab
            alerts={historyAlerts}
            events={historyEventsQuery.data ?? []}
            signals={historySignalsQuery.data ?? []}
            loading={
              historyQuery.isLoading ||
              historyEventsQuery.isLoading ||
              historySignalsQuery.isLoading
            }
          />
        )}

        {activeTab === "events" && (
          <>
            <EventsTab
              events={filteredEvents}
              loading={eventsPageQuery.isLoading}
              mapMarkers={eventMapMarkers}
              mapRegions={eventMapRegions}
              mapCenter={mapCenter}
              mapZoom={mapZoom}
            />
            <PaginationFooter
              page={eventsPageNum}
              total={eventsPageQuery.data?.totalCount ?? 0}
              totalPages={eventsTotalPages}
              pageSize={PAGE_SIZE}
              onChange={setEventsPageNum}
            />
          </>
        )}
      </Box>

      <CreateSignalModal
        opened={createModalOpened}
        onClose={closeCreateModal}
      />
    </Box>
  );
}

// ── Pagination footer ─────────────────────────────────────────────────────
// Compact "Showing X–Y of Z · [< 1 2 3 >]" row rendered under each tab.
// Keeps the loading flicker subtle by hiding the controls entirely when
// there's only one page of results.
function PaginationFooter({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <Group justify="space-between" mt={16} px={4}>
      <Text size="xs" c="#737373">
        Showing {start.toLocaleString()}–{end.toLocaleString()} of{" "}
        {total.toLocaleString()}
      </Text>
      {totalPages > 1 && (
        <Pagination
          value={page}
          onChange={onChange}
          total={totalPages}
          size="sm"
          siblings={1}
        />
      )}
    </Group>
  );
}
