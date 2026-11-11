"use client";

import { Fragment, forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Checkbox, Loader } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconArrowsSort, IconCheck, IconRefresh } from "@tabler/icons-react";
import { getTypeChips } from "~/lib/disaster-types";
import { severityColors } from "~/lib/constants/severity";
import type { FeedItem } from "../../_lib/detection-model";
import { useSortLabels, type SortChoice, type SortGroup } from "./query-bar";
import css from "./map-first.module.css";

export interface FeedColumnHandle {
  /** Scroll the list so the row sits about 60px from the top. */
  scrollToRow: (id: string) => void;
}

interface FeedColumnProps {
  hidden: boolean;
  items: FeedItem[];
  /** Server total for the scope (before client-side search and source filters). */
  totalCount: number;
  narrowed: boolean;
  /** "event" | "alert" | "signal" for the count noun. */
  noun: "events" | "alerts" | "signals";
  scopeLabel: string;
  dateLabel: string;
  /** The search and filter bar. */
  queryBar: ReactNode;
  sortChoices: readonly SortChoice[];
  sortKey: string;
  onSortChange: (key: string) => void;
  /** Rows show the published time ("Pub. 3 days ago") when sorted by it. */
  timeMode: "activity" | "published";
  /** clear-api's full name per type code, the hover text of a type chip. */
  typePaths: ReadonlyMap<string, string>;
  newCount: number;
  onRefresh: () => void;
  selectedId: string | null;
  onSelect: (item: FeedItem) => void;
  onHover: (id: string | null) => void;
  loading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  /** Best one-step recovery when nothing matches, or null for "Try a longer date range". */
  recovery: { label: string; count: number } | null;
  onRecover: () => void;
  /** Changes when the filter scope changes, to replay the list fade. */
  refreshKey: string;
  freshIds: ReadonlySet<string>;
  checkedIds: readonly string[];
  onToggleCheck: ((id: string) => void) | null;
  bulkBar?: ReactNode;
  skeleton: ReactNode;
}

export const FeedColumn = forwardRef<FeedColumnHandle, FeedColumnProps>(function FeedColumn(props, ref) {
  const {
    hidden, items, totalCount, narrowed, noun, scopeLabel, dateLabel, queryBar, sortChoices, sortKey, onSortChange,
    timeMode, typePaths, newCount, onRefresh, selectedId, onSelect, onHover, loading, isFetchingMore, hasMore, onLoadMore, recovery,
    onRecover, refreshKey, freshIds, checkedIds, onToggleCheck, bulkBar, skeleton,
  } = props;
  const t = useTranslations("detection.mapFirst");
  const format = useFormatter();
  const feedRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLElement>());

  useImperativeHandle(ref, () => ({
    scrollToRow: (id) => {
      const feed = feedRef.current;
      const row = rowRefs.current.get(id);
      if (!feed || !row) return;
      feed.scrollTop = Math.max(0, row.offsetTop - feed.offsetTop - 60);
    },
  }));

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const feed = feedRef.current;
    if (!sentinel || !feed) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && hasMore && !isFetchingMore) onLoadMore();
      },
      { root: feed, threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, onLoadMore]);

  const nounLabel = t(`noun.${noun}`, { count: narrowed ? totalCount : items.length });
  const countText = narrowed
    ? t.rich("countNarrowed", { shown: format.number(items.length), total: format.number(totalCount), noun: nounLabel, scope: scopeLabel, date: dateLabel, b: (c) => <b>{c}</b> })
    : t.rich("count", { total: format.number(totalCount), noun: nounLabel, scope: scopeLabel, date: dateLabel, b: (c) => <b>{c}</b> });

  return (
    <aside className={`${css.list} ${hidden ? css.listHidden : ""}`} aria-hidden={hidden || undefined}>
      <div className={css.toolbar}>
        {queryBar}
        <div className={css.countRow}>
          <span className={css.count}>{loading ? "…" : countText}</span>
          <div className={css.countActions}>
            {newCount > 0 && (
              <button type="button" className={css.newPill} onClick={onRefresh}>
                <IconRefresh size={13} />
                {t("newCount", { count: newCount })}
              </button>
            )}
            <SortMenu choices={sortChoices} value={sortKey} onChange={onSortChange} />
          </div>
        </div>
        {bulkBar}
      </div>

      <div ref={feedRef} key={refreshKey} className={`${css.feed} ${css.feedRefresh}`} style={{ position: "relative" }}>
        {loading && items.length === 0 && skeleton}

        {!loading && items.length === 0 && (
          <div className={css.empty}>
            <span className={css.emptyTitle}>{t(`empty.${noun}`)}</span>
            {recovery ? (
              <button type="button" className={css.emptyButton} onClick={onRecover}>
                {t.rich("empty.remove", { what: recovery.label, count: format.number(recovery.count), b: (c) => <b>{c}</b> })}
              </button>
            ) : (
              <span className={css.signalCount}>{t("empty.longer")}</span>
            )}
          </div>
        )}

        {items.map((item) => (
          <FeedRow
            key={item.id}
            item={item}
            timeMode={timeMode}
            typePaths={typePaths}
            selected={selectedId === item.id}
            fresh={freshIds.has(item.id)}
            checked={checkedIds.includes(item.id)}
            anyChecked={checkedIds.length > 0}
            onToggleCheck={onToggleCheck}
            onSelect={onSelect}
            onHover={onHover}
            registerRef={(el) => {
              if (el) rowRefs.current.set(item.id, el);
              else rowRefs.current.delete(item.id);
            }}
          />
        ))}

        {hasMore && items.length > 0 && <div ref={sentinelRef} style={{ height: 1, flexShrink: 0 }} />}
        {isFetchingMore && (
          <div className={css.feedNote}>
            <Loader size="xs" />
          </div>
        )}
      </div>
    </aside>
  );
});

const SORT_GROUPS: readonly SortGroup[] = ["activity", "severity", "published"];

/** The sort button on the count row and its grouped menu. */
function SortMenu({ choices, value, onChange }: { choices: readonly SortChoice[]; value: string; onChange: (key: string) => void }) {
  const t = useTranslations("detection.mapFirst");
  const labels = useSortLabels();
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const current = choices.find((c) => c.key === value) ?? choices[0];

  useLayoutEffect(() => {
    const button = buttonRef.current;
    if (open && button) setTop(button.offsetTop + button.offsetHeight + 4);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!current) return null;
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={css.sortButton}
        data-testid="feed-sort-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        title={t("sort.title", { group: labels.group(current.group), option: labels.option(current) })}
        onClick={() => setOpen((o) => !o)}
      >
        <IconArrowsSort size={15} />
        <span>{t(`sort.short.${current.group}`)}</span>
        {current.dir === "asc" ? (
          <IconArrowUp size={13} color="var(--color-text-muted)" />
        ) : (
          <IconArrowDown size={13} color="var(--color-text-muted)" />
        )}
      </button>
      {open && (
        <div ref={menuRef} className={css.sortMenu} style={{ top }} role="menu" aria-label={t("sort.menu")}>
          <div className={css.ddBody}>
            {SORT_GROUPS.map((group) => {
              const options = choices.filter((c) => c.group === group);
              if (options.length === 0) return null;
              return (
                <Fragment key={group}>
                  <div className={css.groupHeader}>{labels.group(group)}</div>
                  {options.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      role="menuitemradio"
                      aria-checked={c.key === value}
                      className={css.sortOption}
                      onClick={() => {
                        onChange(c.key);
                        setOpen(false);
                      }}
                    >
                      {labels.option(c)}
                      {c.key === value && <IconCheck size={15} color="var(--color-accent)" className={css.sortCheck} />}
                    </button>
                  ))}
                </Fragment>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function FeedRow({
  item, timeMode, typePaths, selected, fresh, checked, anyChecked, onToggleCheck, onSelect, onHover, registerRef,
}: {
  item: FeedItem;
  timeMode: "activity" | "published";
  typePaths: ReadonlyMap<string, string>;
  selected: boolean;
  fresh: boolean;
  checked: boolean;
  anyChecked: boolean;
  onToggleCheck: ((id: string) => void) | null;
  onSelect: (item: FeedItem) => void;
  onHover: (id: string | null) => void;
  registerRef: (el: HTMLElement | null) => void;
}) {
  const t = useTranslations("detection");
  const tMap = useTranslations("map");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const sevText = severityColors[item.severity]?.text ?? "var(--color-text-muted)";
  const chips = getTypeChips(item.typeCodes);
  const showState = item.stateName && item.stateName !== item.place;
  const published = timeMode === "published";
  const time = published ? (item.firstAt ?? item.lastAt) : item.lastAt;

  return (
    <div
      ref={registerRef}
      role="button"
      tabIndex={0}
      data-testid={`feed-row-${item.id}`}
      className={`${css.row} ${selected ? css.rowSelected : ""} ${fresh ? css.rowFresh : ""}`}
      onClick={(e) => {
        // Cmd or Ctrl opens the full page in a new tab, as a link would.
        if (e.metaKey || e.ctrlKey) {
          window.open(item.href, "_blank", "noopener");
          return;
        }
        onSelect(item);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item);
        }
      }}
      onMouseEnter={() => onHover(item.id)}
      onMouseLeave={() => onHover(null)}
    >
      {onToggleCheck && (
        <button
          type="button"
          aria-label={t("bulk.selectEvent")}
          aria-pressed={checked}
          data-testid={`select-event-${item.id}`}
          className={`${css.rowCheck} ${anyChecked ? css.rowCheckVisible : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCheck(item.id);
          }}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Checkbox size="xs" checked={checked} readOnly tabIndex={-1} aria-hidden styles={{ input: { cursor: "pointer", pointerEvents: "none" } }} />
        </button>
      )}
      <div className={css.meta}>
        <span className={css.metaTime} title={published ? t("mapFirst.time.published") : t("mapFirst.time.activity")}>
          {published && <span className={css.pubPrefix}>{t("mapFirst.time.pub")} </span>}
          {format.relativeTime(new Date(time), now)}
        </span>
        {item.place && <span className={css.metaPlace}>{item.place}</span>}
        {showState && <span className={css.metaState}>{item.stateName}</span>}
      </div>
      <div className={css.rowBody}>
        <div className={css.rowLine}>
          <span className={css.sevDot} style={{ background: sevText }} />
          <span className={css.sevLabel} style={{ color: sevText }} data-severity={item.severity}>
            {tMap(`severities.${item.severity}`)}
          </span>
          {item.isAlert && <span className={css.alertBadge}>{t("feed.alertBadge")}</span>}
          {item.source && <span className={css.rowSource}>{item.source}</span>}
        </div>
        <span className={css.rowTitle}>{item.title}</span>
        {(chips.length > 0 || item.signalCount != null) && (
          <div className={css.tags}>
            {chips.map((chip) => (
              <span
                key={chip.key}
                className={css.typeChip}
                style={{ color: chip.color, background: chip.bg }}
                title={[...new Set(chip.codes.map((code) => typePaths.get(code) ?? chip.label))].join("\n")}
              >
                {/* The map pin's glyph, as a mask so it takes the chip's colour. */}
                <span aria-hidden className={css.typeChipIcon} style={{ WebkitMaskImage: `url(${chip.icon})`, maskImage: `url(${chip.icon})` }} />
                <span className={css.typeChipLabel}>{chip.label}</span>
              </span>
            ))}
            {item.signalCount != null && (
              <span className={css.signalCount}>{t("feed.signalCount", { count: item.signalCount })}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
