"use client";

import { Badge, Group, Stack, Text, Title } from "@mantine/core";
import { IconCalendar, IconClock, IconDatabase, IconMapPin } from "@tabler/icons-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { SeverityTag } from "~/containers/map/layers/signals/severity-tag";
import { getDisasterPills } from "~/lib/disaster-types";
import { resolveLocationName } from "~/lib/location";
import { signalLocationOf } from "~/lib/location-challenge";
import { BidiTitle } from "~/components/ui/bidi-title";
import { reportHandledError } from "~/lib/report-handled-error";
import { mapSeverity, type GqlSignalDetail } from "~/lib/types/graphql";
import { api } from "~/trpc/react";
import { BackLink, type PanelBack } from "./back-link";
import { PanelLoader } from "./panel-loader";
import classes from "./panel-views.module.css";

const TEXT_PRIMARY = "var(--color-text-primary)";
const TEXT_SECONDARY = "var(--color-text-secondary)";

/** Sections of the design that have no data behind them yet. */
const UPCOMING_SECTIONS = ["impact", "areaContext", "signals", "relatedEvents", "systemData", "takeAction"] as const;

type SignalDetailViewProps = { signalId: string; back: PanelBack };

function MetaItem({ icon: Icon, children }: { icon: typeof IconMapPin; children: React.ReactNode }) {
  return (
    <Group component="span" gap={4} py={4} wrap="nowrap" c={TEXT_PRIMARY}>
      <Icon size={12} aria-hidden />
      <Text component="span" fz={12} lh="12px">
        {children}
      </Text>
    </Group>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <Stack component="section" gap={8} pb={10} className={classes.section} aria-labelledby={id}>
      <Title id={id} order={3} fz={12} fw={400} lh="20px" tt="uppercase" opacity={0.8} c={TEXT_PRIMARY}>
        {title}
      </Title>
      {children}
    </Stack>
  );
}

function SignalDetail({ signal, back }: { signal: GqlSignalDetail; back: PanelBack }) {
  const t = useTranslations("mapV2.panel.detail");
  const tSignal = useTranslations("mapV2.signalTooltip");
  const format = useFormatter();
  const now = useNow();
  const categories = useMemo(() => getDisasterPills(signal.events.flatMap((event) => event.types)), [signal.events]);
  const location = resolveLocationName(signalLocationOf(signal));
  const publishedAt = new Date(signal.publishedAt);

  return (
    <article aria-labelledby="map-panel-signal-title">
      <Stack component="header" gap={16} className={classes.detailHeader}>
        <div>
          <Stack gap={24}>
            <BackLink {...back} />
            <Title
              id="map-panel-signal-title"
              order={2}
              fz={20}
              fw={700}
              lh={1.2}
              lts={-0.2}
              py={12}
              c={TEXT_PRIMARY}
            >
              <BidiTitle>{signal.title ?? tSignal("untitled")}</BidiTitle>
            </Title>
          </Stack>
          <Group gap={10} py={4} align="flex-start">
            <SeverityTag severity={mapSeverity(signal.severity)} />
            {categories.map((category) => (
              <Badge
                key={category.label}
                variant="outline"
                size="xs"
                radius="xl"
                tt="none"
                fw={400}
                className={classes.category}
              >
                {category.label}
              </Badge>
            ))}
          </Group>
        </div>
        <Group className={classes.meta}>
          {location && <MetaItem icon={IconMapPin}>{location}</MetaItem>}
          <MetaItem icon={IconCalendar}>{format.dateTime(publishedAt, { dateStyle: "medium" })}</MetaItem>
          <MetaItem icon={IconClock}>{format.relativeTime(publishedAt, now)}</MetaItem>
          <MetaItem icon={IconDatabase}>{signal.source.name}</MetaItem>
        </Group>
      </Stack>
      <Stack gap={10} px={24} pt={24} pb={16}>
        <Section id="map-panel-signal-summary" title={t("sections.summary")}>
          {signal.description ? (
            <Text fz={14} lh={1.2} c={TEXT_PRIMARY} className={classes.summary}>
              {signal.description}
            </Text>
          ) : (
            <Text fz={12} fs="italic" lh="18px" c={TEXT_SECONDARY}>
              {t("noSummary")}
            </Text>
          )}
        </Section>
        {UPCOMING_SECTIONS.map((section) => (
          <Section key={section} id={`map-panel-signal-${section}`} title={t(`sections.${section}`)}>
            <Text fz={12} fs="italic" lh="18px" c={TEXT_SECONDARY}>
              {t("comingSoon")}
            </Text>
          </Section>
        ))}
      </Stack>
    </article>
  );
}

export function SignalDetailView({ signalId, back }: SignalDetailViewProps) {
  const t = useTranslations("mapV2.panel.detail");
  const query = api.signals.get.useQuery({ id: signalId });

  useEffect(() => {
    if (query.error) reportHandledError(query.error, { feature: "map-v2", stage: "signal-detail" });
  }, [query.error]);

  if (query.data) return <SignalDetail signal={query.data} back={back} />;

  let status: React.ReactNode;
  if (query.isPending) {
    status = <PanelLoader label={t("loading")} />;
  } else {
    status = (
      <Text fz={14} c={TEXT_SECONDARY}>
        {query.isError ? t("error") : t("notFound")}
      </Text>
    );
  }

  return (
    <Stack gap={24} p={24}>
      <BackLink {...back} />
      {status}
    </Stack>
  );
}
