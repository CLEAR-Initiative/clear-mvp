"use client";

import { Badge, Box, Collapse, Group, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconChevronDown, type IconMapPin } from "@tabler/icons-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { BidiTitle } from "~/components/ui/bidi-title";
import { SeverityTag } from "~/containers/map/layers/signals/severity-tag";
import type { LngLatPoint } from "~/containers/map/selection";
import { mapSeverity } from "~/lib/types/graphql";
import type { PanelBack } from "./back-link";
import { PanelLoader } from "./panel-loader";
import { PanelNav, PanelTop } from "./panel-nav";
import classes from "./panel-views.module.css";
import { usePeekTitle } from "./sheet-context";

export const TEXT_PRIMARY = "var(--color-text-primary)";
export const TEXT_SECONDARY = "var(--color-text-secondary)";

export const DETAIL_TITLE_ID = "map-panel-detail-title";

export function MetaItem({ icon: Icon, children }: { icon: typeof IconMapPin; children: React.ReactNode }) {
  return (
    <Group component="span" gap={4} py={4} wrap="nowrap" c={TEXT_PRIMARY}>
      <Icon size={12} aria-hidden />
      <Text component="span" fz={12} lh="12px">
        {children}
      </Text>
    </Group>
  );
}

export function CategoryTag({ label }: { label: string }) {
  return (
    <Badge variant="outline" size="xs" radius="xl" tt="none" fw={400} className={classes.category}>
      {label}
    </Badge>
  );
}

type DetailHeaderProps = {
  back: PanelBack;
  point: LngLatPoint | null;
  title: string;
  severity: number | null;
  categories: string[];
  /** The meta items under the tags: place, dates, counts. */
  children: React.ReactNode;
};

/** The tinted top of a detail view: title, tags and meta under the nav row. */
export function DetailHeader({ back, point, title, severity, categories, children }: DetailHeaderProps) {
  usePeekTitle(title);

  return (
    <PanelTop back={back} point={point} tinted>
      <Stack component="header" gap={16}>
        <div>
          <Title id={DETAIL_TITLE_ID} order={2} fz={20} fw={700} lh={1.2} lts={-0.2} py={12} c={TEXT_PRIMARY}>
            <BidiTitle>{title}</BidiTitle>
          </Title>
          <Group gap={10} py={4} align="flex-start">
            <SeverityTag severity={mapSeverity(severity)} />
            {categories.map((category) => (
              <CategoryTag key={category} label={category} />
            ))}
          </Group>
        </div>
        <Group className={classes.meta}>{children}</Group>
      </Stack>
    </PanelTop>
  );
}

/** The sections under the header. */
export function DetailBody({ children }: { children: React.ReactNode }) {
  return (
    <Stack gap={10} px={24} pt={24} pb={16}>
      {children}
    </Stack>
  );
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Title id={id} order={3} fz={12} fw={400} lh="20px" tt="uppercase" opacity={0.8} c={TEXT_PRIMARY}>
      {children}
    </Title>
  );
}

type SectionProps = { id: string; title: string; aside?: React.ReactNode; children: React.ReactNode };

export function Section({ id, title, aside, children }: SectionProps) {
  return (
    <Stack component="section" gap={8} pb={10} className={classes.section} aria-labelledby={id}>
      <Group justify="space-between" wrap="nowrap">
        <SectionTitle id={id}>{title}</SectionTitle>
        {aside}
      </Group>
      {children}
    </Stack>
  );
}

/** The italic line a section shows when it has nothing to list. */
export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <Text fz={12} fs="italic" lh="18px" c={TEXT_SECONDARY}>
      {children}
    </Text>
  );
}

export type Fact = { label: string; value: string };

/** Label and value pairs: figures (Impact, Area context) or, `small`, identifiers and dates. */
export function FactRows({ facts, small = false }: { facts: Fact[]; small?: boolean }) {
  return (
    <Stack component="dl" gap={4} m={0}>
      {facts.map(({ label, value }) => (
        <Group key={label} gap={24} py={2} wrap="nowrap" align="flex-start" c={TEXT_PRIMARY}>
          <Text component="dt" fz={12} lh="18px" opacity={0.8} className={classes.factLabel}>
            {label}
          </Text>
          <Text component="dd" m={0} fz={small ? 12 : 14} fw={600} lh="18px" className={classes.factValue}>
            {value}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}

type CollapsibleSectionProps = {
  id: string;
  title: string;
  /** Shown in a bubble next to the title, when known. */
  count?: number;
  /** A line under the title, visible while folded. */
  hint?: string;
  children: React.ReactNode;
};

/** A section folded under its title; the title row unfolds it in place. */
export function CollapsibleSection({ id, title, count, hint, children }: CollapsibleSectionProps) {
  const t = useTranslations("mapV2.panel.detail");
  const [open, setOpen] = useState(false);
  const contentId = useId();

  return (
    <Stack component="section" gap={4} pb={10} className={classes.section} aria-labelledby={id}>
      <UnstyledButton
        className={classes.collapsibleToggle}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={contentId}
        aria-label={open ? t("collapse", { section: title }) : t("expand", { section: title })}
        pt={4}
      >
        <Group justify="space-between" wrap="nowrap">
          <Group gap={8} wrap="nowrap">
            <SectionTitle id={id}>{title}</SectionTitle>
            {count !== undefined && (
              <span className={classes.count} aria-hidden>
                {count}
              </span>
            )}
          </Group>
          <IconChevronDown size={16} aria-hidden className={classes.chevron} data-open={open || undefined} />
        </Group>
      </UnstyledButton>
      {hint && (
        <Text fz={12} fs="italic" lh="18px" c={TEXT_SECONDARY}>
          {hint}
        </Text>
      )}
      <Collapse in={open} id={contentId}>
        <Box pt={4}>{children}</Box>
      </Collapse>
    </Stack>
  );
}

/** `severity` left out shows no severity tag: the detail pages don't load it for every list. */
type LinkRowItem = { id: string; href: string; title: string; severity?: number | null; category?: string };

/** Signals or events in a section: each opens its own detail page. */
export function LinkRows({ items }: { items: LinkRowItem[] }) {
  return (
    <Stack component="ul" gap={4} m={0} p={0} className={classes.rows}>
      {items.map((item) => (
        <li key={item.id}>
          <Link href={item.href} className={classes.linkRow}>
            <Group gap={24} align="flex-start" wrap="nowrap" py={2}>
              <Text
                component="span"
                fz={12}
                fw={600}
                lh="15px"
                opacity={0.8}
                c={TEXT_PRIMARY}
                className={classes.rowTitle}
              >
                <BidiTitle>{item.title}</BidiTitle>
              </Text>
              <Group component="span" gap={6} wrap="nowrap" className={classes.rowTag}>
                {item.severity !== undefined && <SeverityTag severity={mapSeverity(item.severity)} />}
                {item.category && <CategoryTag label={item.category} />}
              </Group>
            </Group>
          </Link>
        </li>
      ))}
    </Stack>
  );
}

type SystemDataProps = { facts: Fact[]; areasLabel: string; areas: string[] };

/** Identifiers and dates, then the areas the detection touches. */
export function SystemData({ facts, areasLabel, areas }: SystemDataProps) {
  return (
    <Stack gap={8}>
      <FactRows facts={facts} small />
      {areas.length > 0 && (
        <Stack gap={6}>
          <Text fz={12} lh="18px" opacity={0.8} c={TEXT_PRIMARY}>
            {areasLabel}
          </Text>
          <Group gap={6}>
            {areas.map((area) => (
              <CategoryTag key={area} label={area} />
            ))}
          </Group>
        </Stack>
      )}
    </Stack>
  );
}

export type LoadingCopy = { loading: string; error: string; notFound: string };

/** A detail view that has no content yet: the way back and what is happening. */
export function DetailStatus({ back, status }: { back: PanelBack; status: React.ReactNode }) {
  return (
    <Stack gap={24} p={24}>
      <PanelNav back={back} point={null} />
      {status}
    </Stack>
  );
}

export function detailStatusOf(query: { isPending: boolean; isError: boolean }, copy: LoadingCopy) {
  if (query.isPending) return <PanelLoader label={copy.loading} />;
  return (
    <Text fz={14} c={TEXT_SECONDARY}>
      {query.isError ? copy.error : copy.notFound}
    </Text>
  );
}
