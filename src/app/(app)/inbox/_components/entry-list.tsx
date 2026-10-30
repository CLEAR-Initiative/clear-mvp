"use client";

import { useFormatter, useNow, useTranslations } from "next-intl";
import { IconPaperclip, IconSearch } from "@tabler/icons-react";
import {
  isCaseGroupEntry,
  isHotlineEntry,
  isUnreadEntry,
  type CaseGroupEntry,
  type HotlineEntry,
  type InboxEntry,
  type InboxSort,
  type LocationChallengeEntry,
} from "~/lib/hotline-inbox";
import { locationChain } from "~/lib/location-challenge";
import { WEB_SEARCH_KIND } from "~/lib/impact-prior-source";
import { getHazardName } from "~/lib/disaster-types";
import { InboxEntryPills } from "./classification-pill";
import styles from "../inbox.module.css";

interface EntryListProps {
  entries: InboxEntry[];
  selectedId: string | null;
  readIds: Set<string>;
  search: string;
  sort: InboxSort;
  onSearchChange: (value: string) => void;
  onSortToggle: () => void;
  onSelect: (id: string) => void;
  /** The first load of a kind the reader sees has not landed yet: say so
   * rather than "Nothing left in this view", which would claim an empty
   * queue that may not be. */
  loading?: boolean;
}

function HotlineRow({ entry }: { entry: HotlineEntry }) {
  const t = useTranslations("inbox");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const mediaCount = entry.attachments.length + entry.omittedMediaCount;
  return (
    <span className={styles.entryBody}>
      <span className={styles.entryLine1}>
        <span className={styles.entryTitle}>{entry.title || t("pane.noText")}</span>
        <span className={styles.entryTime}>{format.relativeTime(new Date(entry.sentAt), now)}</span>
      </span>
      <span className={styles.entryPreview}>
        {entry.text.length > 0 ? entry.text.split("\n\n")[0] : t("pane.noText")}
      </span>
      <span className={styles.entryMeta}>
        <InboxEntryPills entry={entry} />
        {mediaCount > 0 && (
          <span className={styles.metaIcon}>
            <IconPaperclip size={12} />
            {mediaCount}
          </span>
        )}
        {entry.priorEntries > 0 && (
          <span className={styles.relation}>{t("list.priorEntries", { count: entry.priorEntries })}</span>
        )}
      </span>
    </span>
  );
}

/** An Event's proposed signals (web cases): the Event, how many cases wait, and when the
 * newest was proposed. */
function CaseGroupRow({ entry }: { entry: CaseGroupEntry }) {
  const t = useTranslations("inbox");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const hazards = [...new Set(entry.cases.map((c) => getHazardName(c.hazardType)))].join(", ");
  return (
    <span className={styles.entryBody}>
      <span className={styles.entryLine1}>
        <span className={styles.entryTitle}>{entry.eventTitle ?? t("event.untitled")}</span>
        <span className={styles.entryTime}>{format.relativeTime(new Date(entry.sentAt), now)}</span>
      </span>
      <span className={styles.entryPreview}>
        {t("cases.preview", { count: entry.undecided, hazard: hazards })}
      </span>
      <span className={styles.entryMeta}>
        <InboxEntryPills entry={entry} />
      </span>
    </span>
  );
}

/** A Location challenge: the Signal, what the analyst proposed, and who
 * filed it when. */
function LocationChallengeRow({ entry }: { entry: LocationChallengeEntry }) {
  const t = useTranslations("inbox");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const c = entry.challenge;
  const place =
    c.proposedName?.trim() ||
    locationChain(c.proposedPlacement) ||
    (c.proposedLat != null && c.proposedLng != null ? `${c.proposedLat.toFixed(4)}, ${c.proposedLng.toFixed(4)}` : null);
  return (
    <span className={styles.entryBody}>
      <span className={styles.entryLine1}>
        <span className={styles.entryTitle}>{entry.signalTitle ?? t("location.untitled")}</span>
        <span className={styles.entryTime}>{format.relativeTime(new Date(entry.sentAt), now)}</span>
      </span>
      <span className={styles.entryPreview}>
        {place ? t("location.preview.proposed", { place }) : t("location.preview.bare")}
      </span>
      <span className={styles.entryMeta}>
        <InboxEntryPills entry={entry} />
        {c.createdByName?.trim() && <span className={styles.relation}>{c.createdByName.trim()}</span>}
      </span>
    </span>
  );
}

export function EntryList({
  entries,
  selectedId,
  readIds,
  search,
  sort,
  onSearchChange,
  onSortToggle,
  onSelect,
  loading = false,
}: EntryListProps) {
  const t = useTranslations("inbox");
  const tStates = useTranslations("common.states");

  return (
    <section className={styles.list} data-testid="inbox-list">
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <IconSearch size={14} />
          <input
            type="search"
            value={search}
            placeholder={t("search")}
            onChange={(e) => onSearchChange(e.target.value)}
            data-testid="inbox-search"
          />
        </label>
        <button type="button" className={styles.sort} onClick={onSortToggle} data-testid="inbox-sort">
          {t(`sort.${sort}`)}
        </button>
      </div>

      <div className={styles.rows}>
        {entries.map((entry) => {
          const unread = isUnreadEntry(entry, readIds);
          return (
            <button
              type="button"
              key={entry.id}
              className={styles.entry}
              data-testid="inbox-entry"
              data-kind={entry.kind}
              // Proposed signals come from the web Worker's kind.
              data-source-kind={isCaseGroupEntry(entry) ? WEB_SEARCH_KIND : undefined}
              data-undecided={isCaseGroupEntry(entry) ? entry.undecided : undefined}
              data-selected={entry.id === selectedId}
              data-unread={unread}
              data-processing={isHotlineEntry(entry) ? entry.processing : undefined}
              onClick={() => onSelect(entry.id)}
            >
              <span className={styles.gutter}>{unread && <span className={styles.unreadDot} />}</span>
              {isHotlineEntry(entry) ? (
                <HotlineRow entry={entry} />
              ) : isCaseGroupEntry(entry) ? (
                <CaseGroupRow entry={entry} />
              ) : (
                <LocationChallengeRow entry={entry} />
              )}
            </button>
          );
        })}
        <div className={styles.listFooter} data-testid="inbox-list-footer" data-loading={loading}>
          {loading ? tStates("loading") : entries.length > 0 ? t("list.allLoaded", { count: entries.length }) : t("list.empty")}
        </div>
      </div>
    </section>
  );
}
