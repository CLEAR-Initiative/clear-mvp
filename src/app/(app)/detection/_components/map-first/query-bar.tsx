"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Checkbox, Radio } from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconSearch, IconX } from "@tabler/icons-react";
import type { HierarchyLevel1 } from "~/components/disaster-type-picker";
import { getDisasterPills } from "~/lib/disaster-types";
import { SEV_RANGE, useFacetCounts, type CountScope, type CountVariant } from "../../_hooks/use-facet-counts";
import {
  DATE_PRESETS,
  MARKER_COLORS,
  QUALIFIER_KEYS,
  SEVERITIES,
  dateOfKey,
  daysOf,
  isL1Checked,
  isStatePartial,
  matchesText,
  parseQuery,
  parseSinceDays,
  placeState,
  qualifierAliases,
  typeLeaves,
  type DateKey,
  type FeedTab,
  type QualifierKey,
  type RegionState,
  type Severity,
} from "../../_lib/detection-model";
import css from "./map-first.module.css";

/** A filter dimension shown as a token in the bar. */
export type TokenDim = "region" | "types" | "sources" | "sev" | "date";

export interface QueryToken {
  dim: TokenDim;
  key: QualifierKey;
  value: string;
}

export type SortGroup = "activity" | "severity" | "published";

/** One sort option: the feed's sort value and how the menu groups it. */
export interface SortChoice {
  key: string;
  group: SortGroup;
  dir: "desc" | "asc";
}

/** Labels for a sort choice: its group ("Last activity") and option ("Newest first"). */
export function useSortLabels() {
  const t = useTranslations("detection.mapFirst.sort");
  return {
    group: (g: SortGroup) => t(`group.${g}`),
    option: (c: SortChoice) => (c.group === "severity" ? t("option.highest") : c.dir === "asc" ? t("option.oldest") : t("option.newest")),
  };
}

interface QueryBarProps {
  value: string;
  onValueChange: (value: string) => void;
  tab: FeedTab;
  tokens: QueryToken[];
  /** Current value per qualifier for the empty bar's list; sort shows its own. */
  current: Partial<Record<QualifierKey, string>>;
  states: readonly RegionState[];
  hierarchy: readonly HierarchyLevel1[];
  locIds: readonly string[];
  typeFilters: readonly string[];
  severities: ReadonlySet<string>;
  sources: ReadonlySet<string> | null;
  /** Sources in the loaded rows and their counts, most first. */
  sourceFacet: readonly (readonly [string, number])[];
  dateKey: DateKey | null;
  sortChoices: readonly SortChoice[];
  sortKey: string;
  /** Rows the typed text finds. */
  searchCount: number;
  /** The feeds' server scope; the faceted counts vary one dimension of it. */
  countBase: CountScope;
  /** End of the time-range counts (the frozen window's end). */
  nowIso: string;
  onToggleLocation: (id: string) => void;
  onToggleType: (key: string) => void;
  onPickSeverity: (sev: Severity) => void;
  onToggleSource: (name: string) => void;
  onDate: (key: DateKey) => void;
  onSort: (key: string) => void;
  onClearDim: (dim: TokenDim) => void;
  onClearAll: () => void;
}

export interface QueryBarHandle {
  /** Focus the input and open the list, optionally replacing the text (e.g. "in:"). */
  focus: (text?: string) => void;
}

interface ValueRow {
  t: "val";
  key: QualifierKey;
  val: string;
  label: string;
  on: boolean;
  /** A state with some of its districts picked. */
  part?: boolean;
  /** Indented under its state or event type. */
  sub?: boolean;
  /** Has children to expand (districts, subtypes). */
  kids?: boolean;
  exp?: boolean;
  radio?: boolean;
  /** In the free-text list: shows its key instead of a checkbox. */
  prefixed?: boolean;
  /** Muted context: "State", or a district's state. */
  ctx?: string;
  desc?: string;
  dot?: string;
  pill?: { color: string; bg: string };
  /** A server count: its key and the scope it runs with. */
  countKey?: string;
  scope?: CountScope;
  /** A count known here (sources come from the loaded rows). */
  count?: number;
}

type Row = { t: "key"; key: QualifierKey } | { t: "text"; label: string } | ValueRow;

type Mode = { kind: "root" } | { kind: "text"; q: string } | { kind: "val"; key: QualifierKey; q: string };

/** Picks in these lists toggle and keep the list open for more. */
const MULTI: ReadonlySet<QualifierKey> = new Set(["in", "type", "severity", "source"]);
const EXAMPLES: Record<Exclude<QualifierKey, "in">, string> = {
  type: "type:drone",
  severity: "severity:critical",
  source: "source:acled",
  since: "since:30d",
  sort: "sort:severity",
};
/** Districts matching a partial "in:" text are capped: each one is a count query. */
const MAX_DISTRICT_MATCHES = 30;
const DAY_MS = 86_400_000;

const presetDays = (key: DateKey) => daysOf(dateOfKey(key) ?? "") ?? 0;
const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(" ");

/**
 * The list column's search and filter bar: free text searches the rows, typed
 * qualifiers (`in:` `type:` `severity:` `source:` `since:` `sort:`) open their
 * value lists, and the active filters show as tokens inside the bar.
 */
export const QueryBar = forwardRef<QueryBarHandle, QueryBarProps>(function QueryBar(props, ref) {
  const {
    value, onValueChange, tab, tokens, current, states, hierarchy, locIds, typeFilters, severities, sources,
    sourceFacet, dateKey, sortChoices, sortKey, searchCount, countBase, nowIso,
  } = props;
  const t = useTranslations("detection.mapFirst");
  const tMap = useTranslations("map");
  const sortLabels = useSortLabels();
  const format = useFormatter();
  const locale = useLocale();
  const listId = useId();
  const barRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const [hl, setHl] = useState<number | null>(null);
  const [locExpanded, setLocExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [typesExpanded, setTypesExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [ddTop, setDdTop] = useState(0);

  useImperativeHandle(
    ref,
    () => ({
      focus: (text) => {
        if (text != null) onValueChange(text);
        setActive(0);
        setOpen(true);
        inputRef.current?.focus();
      },
    }),
    [onValueChange],
  );

  const parsed = parseQuery(value, locale);
  const mode: Mode = parsed.key
    ? { kind: "val", key: parsed.key, q: parsed.value }
    : parsed.value
      ? { kind: "text", q: parsed.value }
      : { kind: "root" };
  const keys = QUALIFIER_KEYS.filter((k) => k !== "type" || tab !== "signals");

  // ── Value lists ───────────────────────────────────────────────────────────
  const locRows = (q: string, prefixed = false): ValueRow[] => {
    const scopeFor = (id: string): CountScope => ({ ...countBase, locationIds: undefined, locationId: id });
    const stateRow = (s: RegionState, ctx?: string): ValueRow => ({
      t: "val",
      key: "in",
      val: s.id,
      label: s.name,
      ctx,
      on: locIds.includes(s.id),
      part: isStatePartial(s, locIds),
      kids: !prefixed && !q && (s.districts?.length ?? 0) > 1,
      exp: locExpanded.has(s.id),
      prefixed,
      countKey: `in:${s.id}`,
      scope: scopeFor(s.id),
    });
    const districtRow = (s: RegionState, d: { id: string; name: string }, sub: boolean): ValueRow => ({
      t: "val",
      key: "in",
      val: d.id,
      label: d.name,
      ctx: sub ? undefined : s.name,
      sub,
      on: locIds.includes(s.id) || locIds.includes(d.id),
      prefixed,
      countKey: `in:${d.id}`,
      scope: scopeFor(d.id),
    });
    if (!q) {
      return states.flatMap((s) => {
        const row = stateRow(s);
        return row.kids && row.exp ? [row, ...(s.districts ?? []).map((d) => districtRow(s, d, true))] : [row];
      });
    }
    const matchedStates = states.filter((s) => matchesText(s.name, q)).map((s) => stateRow(s, t("qb.state")));
    const matchedDistricts = states.flatMap((s) =>
      (s.districts ?? []).filter((d) => d.name !== s.name && matchesText(d.name, q)).map((d) => districtRow(s, d, false)),
    );
    return [...matchedStates, ...matchedDistricts.slice(0, MAX_DISTRICT_MATCHES)];
  };

  // Event types (level 1) and their detailed types (level 3). Conflict's
  // detailed types carry their ACLED group as context, and the group's name
  // finds them too ("type:protest").
  const typeRows = (q: string, prefixed = false): ValueRow[] => {
    const out: ValueRow[] = [];
    for (const h of hierarchy) {
      const leaves = typeLeaves(hierarchy, h.name);
      const codes = leaves.flatMap((leaf) => leaf.codes);
      const l1Match = matchesText(h.name, q);
      const multi = leaves.length > 1;
      const pill = getDisasterPills(codes)[0];
      if (l1Match) {
        out.push({
          t: "val",
          key: "type",
          val: h.name,
          label: h.name,
          on: isL1Checked(typeFilters, hierarchy, h.name),
          pill: pill ? { color: pill.color, bg: pill.bg } : undefined,
          kids: !prefixed && !q && multi,
          exp: typesExpanded.has(h.name),
          prefixed,
          countKey: `type:${h.name}`,
          scope: { ...countBase, eventTypes: codes },
        });
      }
      if (!multi) continue;
      // Without text, the detailed types show when their event type is
      // expanded; with text, under a matching event type or on their own.
      const underL1 = q ? l1Match : typesExpanded.has(h.name);
      for (const leaf of leaves) {
        const leafMatch = matchesText(leaf.name, q) || (leaf.grouped && matchesText(leaf.group, q));
        if (!underL1 && !(q && leafMatch)) continue;
        out.push({
          t: "val",
          key: "type",
          val: leaf.key,
          label: leaf.name,
          ctx: leaf.grouped ? leaf.group : undefined,
          sub: underL1 && !prefixed,
          on: typeFilters.includes(leaf.key),
          prefixed,
          countKey: `type:${leaf.key}`,
          scope: { ...countBase, eventTypes: leaf.codes },
        });
      }
    }
    return out;
  };

  const allSev = severities.size === 0 || severities.size === SEVERITIES.length;
  const sevRows = (q: string, prefixed = false): ValueRow[] =>
    SEVERITIES.filter((s) => matchesText(tMap(`severities.${s}`), q) || matchesText(s, q)).map((s) => ({
      t: "val",
      key: "severity",
      val: s,
      label: tMap(`severities.${s}`),
      dot: MARKER_COLORS[s],
      on: !allSev && severities.has(s),
      prefixed,
      countKey: `severity:${s}`,
      scope: { ...countBase, ...SEV_RANGE[s] },
    }));

  const sourceRows = (q: string, prefixed = false): ValueRow[] =>
    sourceFacet
      .filter(([name]) => matchesText(name, q))
      .map(([name, n]) => ({ t: "val", key: "source", val: name, label: name, count: n, on: sources?.has(name) ?? false, prefixed }));

  const sinceRows = (q: string): ValueRow[] => {
    const toMs = Date.parse(nowIso);
    const row = (key: DateKey, days: number): ValueRow => ({
      t: "val",
      key: "since",
      val: key,
      label: key.startsWith("c") ? `${days}d` : key,
      desc: days === 1 ? t("last24h") : t("lastDays", { count: days }),
      radio: true,
      on: dateKey === key,
      countKey: `since:${days}`,
      scope: { ...countBase, from: new Date(toMs - days * DAY_MS).toISOString(), to: nowIso },
    });
    const typed = parseSinceDays(q);
    const out: ValueRow[] = [];
    if (typed != null && !DATE_PRESETS.some((k) => presetDays(k) === typed)) out.push(row(`c${typed}`, typed));
    for (const key of DATE_PRESETS) {
      const days = presetDays(key);
      const label = days === 1 ? t("last24h") : t("lastDays", { count: days });
      if (!q || matchesText(key, q) || matchesText(label, q) || typed === days) out.push(row(key, days));
    }
    return out;
  };

  const sortRows = (q: string): ValueRow[] =>
    sortChoices
      .filter((c) => matchesText(`${sortLabels.group(c.group)} ${sortLabels.option(c)}`, q))
      .map((c) => ({
        t: "val",
        key: "sort",
        val: c.key,
        label: sortLabels.group(c.group),
        desc: sortLabels.option(c),
        radio: true,
        on: sortKey === c.key,
      }));

  const valueRows = (key: QualifierKey, q: string): ValueRow[] => {
    switch (key) {
      case "in":
        return locRows(q);
      case "type":
        return typeRows(q);
      case "severity":
        return sevRows(q);
      case "source":
        return sourceRows(q);
      case "since":
        return sinceRows(q);
      case "sort":
        return sortRows(q);
    }
  };

  let draft: Row[] = [];
  if (open) {
    if (mode.kind === "root") draft = keys.map((key) => ({ t: "key", key }));
    else if (mode.kind === "val") draft = valueRows(mode.key, mode.q);
    else {
      const lower = mode.q.toLowerCase();
      const textRow: Row = { t: "text", label: mode.q };
      draft = [
        textRow,
        ...keys.filter((key) => qualifierAliases(key, locale).some((a) => a.startsWith(lower))).map((key): Row => ({ t: "key", key })),
        ...locRows(mode.q, true).slice(0, 4),
        ...(tab !== "signals" ? typeRows(mode.q, true).slice(0, 3) : []),
        ...sourceRows(mode.q, true).slice(0, 2),
        ...sevRows(mode.q, true).slice(0, 2),
      ].slice(0, 11);
    }
  }

  // ── Faceted counts: one limit-1 query per row on show ─────────────────────
  const countRows = draft.filter((r): r is ValueRow & { countKey: string; scope: CountScope } => r.t === "val" && !!r.countKey && !!r.scope);
  const variantsKey = `${tab}|${countRows.map((r) => r.countKey).join(",")}|${JSON.stringify(countBase)}|${nowIso}`;
  const variants: CountVariant[] = useMemo(() => {
    const seen = new Set<string>();
    return countRows.filter((r) => !seen.has(r.countKey) && seen.add(r.countKey)).map((r) => ({ key: r.countKey, scope: r.scope }));
    // `variantsKey` covers every row and scope that goes in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantsKey]);
  const counts = useFacetCounts(tab, variants, open && variants.length > 0);

  const countOf = (r: ValueRow) => r.count ?? (r.countKey ? counts.get(r.countKey) : undefined);
  const byCount = (a: ValueRow, b: ValueRow) => (countOf(b) ?? -1) - (countOf(a) ?? -1) || a.label.localeCompare(b.label);
  let rows: Row[] = draft;
  if (mode.kind === "val" && mode.key === "in") {
    const vals = draft as ValueRow[];
    if (!mode.q) {
      // States by count, each followed by its expanded districts, also by count.
      const groups: ValueRow[][] = [];
      for (const r of vals) {
        if (r.sub) groups[groups.length - 1]?.push(r);
        else groups.push([r]);
      }
      groups.sort((a, b) => byCount(a[0]!, b[0]!));
      rows = groups.flatMap(([head, ...subs]) => [head!, ...subs.sort(byCount)]);
    } else {
      rows = [...vals.filter((r) => r.ctx === t("qb.state")).sort(byCount), ...vals.filter((r) => r.ctx !== t("qb.state")).sort(byCount)];
    }
  }
  const activeIdx = Math.max(0, Math.min(active, rows.length - 1));
  const listsDistricts = mode.kind === "val" && mode.key === "in";
  const togglesValues = mode.kind === "val" && MULTI.has(mode.key);

  // ── Layout: the list sits under the bar, which grows as tokens wrap ───────
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!open || !bar) return;
    const update = () => setDdTop(bar.offsetTop + bar.offsetHeight + 4);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    const body = bodyRef.current;
    const el = body?.querySelector<HTMLElement>('[data-active="true"]');
    if (!body || !el) return;
    if (el.offsetTop < body.scrollTop) body.scrollTop = el.offsetTop - 6;
    else if (el.offsetTop + el.offsetHeight > body.scrollTop + body.clientHeight) {
      body.scrollTop = el.offsetTop + el.offsetHeight - body.clientHeight + 6;
    }
  }, [activeIdx, open, rows.length]);

  // Only newly added tokens animate in.
  const seenTokens = useRef<Set<string>>(new Set());
  useEffect(() => {
    seenTokens.current = new Set(tokens.map((tk) => `${tk.dim}:${tk.value}`));
  });

  // ── Actions ───────────────────────────────────────────────────────────────
  const expand = (row: ValueRow, on: boolean) => {
    const set = row.key === "in" ? setLocExpanded : setTypesExpanded;
    set((prev) => {
      const next = new Set(prev);
      if (on) next.add(row.val);
      else next.delete(row.val);
      return next;
    });
  };

  const apply = (row: Row) => {
    setHl(null);
    if (row.t === "key") {
      onValueChange(`${row.key}:`);
      setActive(0);
      setOpen(true);
      return;
    }
    if (row.t === "text") {
      setOpen(false);
      return;
    }
    // A pick in a qualifier's own multi-select list keeps it open for more.
    const stay = !row.prefixed && MULTI.has(row.key);
    onValueChange(stay ? `${row.key}:` : "");
    if (!stay) setActive(0);
    switch (row.key) {
      case "in": {
        props.onToggleLocation(row.val);
        const state = placeState(row.val, states);
        if (state && state.id !== row.val) setLocExpanded((prev) => new Set(prev).add(state.id));
        break;
      }
      case "type":
        props.onToggleType(row.val);
        if (row.val.includes("::")) setTypesExpanded((prev) => new Set(prev).add(row.val.split("::")[0]!));
        break;
      case "severity":
        props.onPickSeverity(row.val as Severity);
        break;
      case "source":
        props.onToggleSource(row.val);
        break;
      case "since":
        props.onDate(row.val as DateKey);
        break;
      case "sort":
        props.onSort(row.val);
        break;
    }
  };

  const focusInput = () => inputRef.current?.focus();

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(0);
        return;
      }
      const n = Math.max(1, rows.length);
      setActive((activeIdx + (e.key === "ArrowDown" ? 1 : -1) + n) % n);
      return;
    }
    const cur = rows[activeIdx];
    const caretAtEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
    if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && open && cur?.t === "val" && cur.kids && caretAtEnd) {
      e.preventDefault();
      expand(cur, e.key === "ArrowRight");
      return;
    }
    const exactKey = mode.kind === "val" && !mode.q;
    if (e.key === "Enter" || (e.key === " " && open && exactKey && cur)) {
      if (open && cur) {
        e.preventDefault();
        apply(cur);
      }
      return;
    }
    if (e.key === "Tab" && !e.shiftKey && open && value && cur) {
      e.preventDefault();
      apply(cur);
      return;
    }
    if (e.key === "Escape") {
      e.stopPropagation();
      if (open) setOpen(false);
      else input.blur();
      return;
    }
    if (e.key === "Backspace" && input.selectionStart === 0 && input.selectionEnd === 0) {
      if (tokens.length === 0) return;
      e.preventDefault();
      // First press marks the last token, the second removes it.
      if (hl != null && tokens[hl]) {
        props.onClearDim(tokens[hl].dim);
        setHl(null);
      } else setHl(tokens.length - 1);
      return;
    }
    if (hl != null) setHl(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const currentSort = sortChoices.find((c) => c.key === sortKey);
  const currentFor = (key: QualifierKey) =>
    key === "sort"
      ? currentSort
        ? `${sortLabels.group(currentSort.group)} · ${sortLabels.option(currentSort).toLowerCase()}`
        : undefined
      : current[key];
  const exampleFor = (key: QualifierKey) =>
    key === "in" ? `in:${(states[0]?.name ?? "").split(/\s+/)[0]?.toLowerCase() ?? ""}` : EXAMPLES[key];

  const renderRow = (row: Row, i: number): ReactNode => {
    const isActive = i === activeIdx;
    const base = {
      id: `${listId}-${i}`,
      role: "option",
      "aria-selected": isActive,
      "data-active": isActive || undefined,
      onMouseEnter: () => setActive(i),
      onClick: () => apply(row),
    } as const;
    if (row.t === "key") {
      const cur = currentFor(row.key);
      return (
        <div key={`k-${row.key}`} {...base} className={cx(css.ddi, isActive && css.ddiActive)}>
          <span className={css.kw}>{row.key}:</span>
          <span className={css.ddiText}>{t(`qb.keys.${row.key}`)}</span>
          {cur ? <span className={css.ddiCurrent}>{cur}</span> : <span className={css.ddiExample}>{exampleFor(row.key)}</span>}
        </div>
      );
    }
    if (row.t === "text") {
      return (
        <div key="text" {...base} className={cx(css.ddi, isActive && css.ddiActive)}>
          <IconSearch size={15} color="var(--color-text-secondary)" style={{ flexShrink: 0 }} />
          <span className={css.ddiText}>{t.rich("qb.search", { query: row.label, b: (c) => <b>{c}</b> })}</span>
          <span className={css.ddiCount}>{format.number(searchCount)}</span>
        </div>
      );
    }
    const n = countOf(row);
    const control = row.prefixed ? (
      <span className={cx(css.kw, css.kwInline)}>{row.key}:</span>
    ) : row.radio ? (
      <Radio size="xs" checked={row.on} readOnly tabIndex={-1} aria-hidden styles={{ radio: { cursor: "pointer" }, root: { pointerEvents: "none" } }} />
    ) : (
      <Checkbox
        size="xs"
        checked={row.on || !!row.part}
        indeterminate={!row.on && !!row.part}
        readOnly
        tabIndex={-1}
        aria-hidden
        styles={{ root: { pointerEvents: "none" } }}
      />
    );
    return (
      <div
        key={`${row.key}-${row.val}`}
        {...base}
        className={cx(css.ddi, isActive && css.ddiActive, row.sub && css.ddiSub, n === 0 && css.ddiZero)}
      >
        {control}
        {row.pill ? (
          <span className={css.pill} style={{ color: row.pill.color, background: row.pill.bg }}>
            {row.label}
          </span>
        ) : (
          <>
            {row.dot && <span className={css.sevDotSmall} style={{ background: row.dot }} />}
            <span className={css.ddiText}>
              {row.label}
              {row.desc && <span className={css.ddiDesc}> {row.desc}</span>}
            </span>
          </>
        )}
        {row.ctx && <span className={css.ddiCtx}>{row.ctx}</span>}
        {n != null && <span className={css.ddiCount}>{format.number(n)}</span>}
        {row.kids && (
          <span
            role="button"
            tabIndex={-1}
            className={css.exp}
            title={row.key === "in" ? (row.exp ? t("qb.hideDistricts") : t("qb.showDistricts")) : row.exp ? t("qb.collapse") : t("qb.expand")}
            aria-label={row.key === "in" ? (row.exp ? t("qb.hideDistricts") : t("qb.showDistricts")) : row.exp ? t("qb.collapse") : t("qb.expand")}
            onClick={(e) => {
              e.stopPropagation();
              expand(row, !row.exp);
            }}
          >
            {row.exp ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </span>
        )}
      </div>
    );
  };

  const header =
    mode.kind === "root" ? (
      <div className={css.groupHeader}>{t("qb.filterBy")}</div>
    ) : mode.kind === "val" ? (
      <div className={cx(css.groupHeader, css.ddHeader)}>
        <span>{t(`qb.keys.${mode.key}`)}</span>
        <span className={css.ddHeaderHint}>{MULTI.has(mode.key) ? t("qb.pickMany") : t("qb.pickOne")}</span>
      </div>
    ) : null;

  return (
    <>
      <div
        ref={barRef}
        className={css.qb}
        onMouseDown={(e) => {
          if (e.target !== inputRef.current) e.preventDefault();
        }}
        onClick={focusInput}
      >
        <span className={css.qbIcon}>
          <IconSearch size={16} color="var(--color-text-muted)" />
        </span>
        <div className={css.qbWrap}>
          {tokens.map((tk, i) => (
            <span
              key={tk.dim}
              data-testid={`query-token-${tk.key}`}
              className={cx(css.tok, hl === i && css.tokHl, !seenTokens.current.has(`${tk.dim}:${tk.value}`) && css.tokEnter)}
              title={t("qb.tokenTitle", { token: `${tk.key}:${tk.value}` })}
              onClick={(e) => {
                e.stopPropagation();
                setHl(null);
                onValueChange(`${tk.key}:`);
                setActive(0);
                setOpen(true);
                focusInput();
              }}
            >
              <span className={css.tokKey}>{tk.key}:</span>
              <span className={css.tokValue}>{tk.value}</span>
              <button
                type="button"
                className={css.tokX}
                aria-label={t("qb.removeToken", { key: tk.key })}
                title={t("qb.removeToken", { key: tk.key })}
                onClick={(e) => {
                  e.stopPropagation();
                  props.onClearDim(tk.dim);
                  setHl(null);
                  focusInput();
                }}
              >
                <IconX size={11} />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            className={css.qbInput}
            value={value}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && rows.length > 0 ? `${listId}-${activeIdx}` : undefined}
            aria-label={t("qb.label")}
            data-testid="query-bar-input"
            placeholder={tokens.length > 0 ? t("qb.placeholderMore") : t("qb.placeholder")}
            onChange={(e) => {
              onValueChange(e.currentTarget.value);
              setActive(0);
              setOpen(true);
              setHl(null);
            }}
            onKeyDown={onKeyDown}
            onFocus={() => {
              setFocused(true);
              setOpen(true);
              setActive(0);
            }}
            onBlur={() => {
              setFocused(false);
              window.setTimeout(() => {
                if (document.activeElement !== inputRef.current) {
                  setOpen(false);
                  setHl(null);
                }
              }, 0);
            }}
          />
        </div>
        {!focused && !value && <span className={cx(css.kbd, css.qbKbd)}>/</span>}
        {(tokens.length > 0 || value) && (
          <button
            type="button"
            className={css.qbClear}
            aria-label={t("qb.clear")}
            title={t("qb.clear")}
            onClick={(e) => {
              e.stopPropagation();
              props.onClearAll();
              onValueChange("");
              setHl(null);
              setActive(0);
              focusInput();
            }}
          >
            <IconX size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className={css.dd} style={{ top: ddTop }} onMouseDown={(e) => e.preventDefault()}>
          <div ref={bodyRef} id={listId} role="listbox" aria-label={t("qb.label")} className={css.ddBody}>
            {header}
            {rows.map((row, i) => (
              <div key={row.t === "val" ? `${row.key}-${row.val}` : row.t === "key" ? `k-${row.key}` : "text"} style={{ display: "contents" }}>
                {mode.kind === "text" && i === 1 && <div className={css.groupHeader}>{t("qb.filters")}</div>}
                {renderRow(row, i)}
              </div>
            ))}
            {mode.kind === "val" && rows.length === 0 && <div className={css.note}>{t("qb.noMatches", { query: mode.q })}</div>}
          </div>
          <div className={css.ddFoot}>
            <span>
              <span className={css.kbd}>↑↓</span>
              {t("qb.hint.navigate")}
            </span>
            <span>
              <span className={css.kbd}>↵</span>
              {togglesValues ? t("qb.hint.toggle") : t("qb.hint.select")}
            </span>
            <span>
              <span className={css.kbd}>tab</span>
              {t("qb.hint.complete")}
            </span>
            {listsDistricts && (
              <span>
                <span className={css.kbd}>→</span>
                {t("qb.hint.districts")}
              </span>
            )}
            <span>
              <span className={css.kbd}>⌫</span>
              {t("qb.hint.remove")}
            </span>
            <span>
              <span className={css.kbd}>esc</span>
              {t("qb.hint.close")}
            </span>
          </div>
        </div>
      )}
    </>
  );
});
