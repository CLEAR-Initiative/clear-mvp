"use client";

import { useFormatter, useTranslations } from "next-intl";
import { IconPaperclip, IconSearch } from "@tabler/icons-react";
import type { InboxEntry, InboxSort } from "~/lib/hotline-inbox";
import { InboxClassificationPill } from "./classification-pill";
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
}: EntryListProps) {
  const t = useTranslations("inbox");
  const format = useFormatter();

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
          const unread = !readIds.has(entry.id);
          const mediaCount = entry.attachments.length + entry.omittedMediaCount;
          return (
            <button
              type="button"
              key={entry.id}
              className={styles.entry}
              data-testid="inbox-entry"
              data-selected={entry.id === selectedId}
              data-unread={unread}
              onClick={() => onSelect(entry.id)}
            >
              <span className={styles.gutter}>{unread && <span className={styles.unreadDot} />}</span>
              <span className={styles.entryBody}>
                <span className={styles.entryLine1}>
                  <span className={styles.entryTitle}>{entry.title || t("pane.noText")}</span>
                  <span className={styles.entryTime}>
                    {format.relativeTime(new Date(entry.sentAt))}
                  </span>
                </span>
                <span className={styles.entryPreview}>
                  {entry.text.length > 0 ? entry.text.split("\n\n")[0] : t("pane.noText")}
                </span>
                <span className={styles.entryMeta}>
                  <InboxClassificationPill value={entry.classification} />
                  {mediaCount > 0 && (
                    <span className={styles.metaIcon}>
                      <IconPaperclip size={12} />
                      {mediaCount}
                    </span>
                  )}
                  {entry.priorEntries > 0 && (
                    <span className={styles.relation}>
                      {t("list.priorEntries", { count: entry.priorEntries })}
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
        <div className={styles.listFooter}>
          {entries.length > 0 ? t("list.allLoaded", { count: entries.length }) : t("list.empty")}
        </div>
      </div>
    </section>
  );
}
