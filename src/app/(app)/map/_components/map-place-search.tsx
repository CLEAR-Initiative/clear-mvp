"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { IconCurrentLocation, IconSearch, IconX } from "@tabler/icons-react";
import {
  geocodePlaceQuery,
  zoomForPlaceTypes,
  type GeocodeHit,
} from "~/lib/map/geocode-lookup";
import {
  anchorFromHit,
  composeStackedPlaceQuery,
  decideStack,
  pickStackedPlaceHit,
  recommendationScope,
  type PlaceSearchFilter,
} from "~/lib/map/place-search-stack";
import styles from "./map-place-search.module.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export type MapPlaceSearchSelect = GeocodeHit & { zoom: number };

type MapPlaceSearchProps = {
  onSelect: (hit: MapPlaceSearchSelect) => void;
  /** Last stacked pill removed — drop the place camera lock. */
  onClear?: () => void;
  /** How many orange filter pills are committed (0 when the bar is empty). */
  onStackChange?: (count: number) => void;
};

function toSelect(hit: GeocodeHit): MapPlaceSearchSelect {
  return { ...hit, zoom: zoomForPlaceTypes(hit.placeTypes) };
}

export function MapPlaceSearch({ onSelect, onClear, onStackChange }: MapPlaceSearchProps) {
  const t = useTranslations("map.placeSearch");
  const locale = useLocale();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const filterSeq = useRef(0);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<PlaceSearchFilter[]>([]);
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);

  const expanded = open || filters.length > 0;
  const anchor = filters.length > 0 ? anchorFromHit(filters[filters.length - 1]!.hit) : null;

  useEffect(() => {
    onStackChange?.(filters.length);
  }, [filters.length, onStackChange]);

  const collapse = useCallback(() => {
    abortRef.current?.abort();
    setOpen(false);
    setQuery("");
    setHits([]);
    setActiveIndex(0);
    setLoading(false);
    setError(null);
  }, []);

  const clearAll = useCallback(() => {
    collapse();
    setFilters([]);
    onClear?.();
  }, [collapse, onClear]);

  const openSearch = useCallback(() => {
    setOpen(true);
    setError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      if (filters.length > 0) {
        setHits([]);
        setError(null);
        setOpen(false);
        return;
      }
      collapse();
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (query.trim()) {
        setQuery("");
        setHits([]);
        setError(null);
        return;
      }
      if (filters.length > 0) {
        clearAll();
        return;
      }
      collapse();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [expanded, filters.length, query, collapse, clearAll]);

  useEffect(() => {
    if (!open) return;
    const token = query.trim();
    if (token.length < 2) {
      abortRef.current?.abort();
      setHits([]);
      setLoading(false);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);

    const scope = recommendationScope(filters);

    const timer = window.setTimeout(() => {
      void geocodePlaceQuery(token, MAPBOX_TOKEN, {
        limit: 5,
        signal: ac.signal,
        language: locale,
        ...scope,
      })
        .then(async (next) => {
          if (ac.signal.aborted) return;
          let hitsForText = next;
          if (hitsForText.length === 0 && scope.bbox) {
            const { bbox: _bbox, ...withoutBbox } = scope;
            hitsForText = await geocodePlaceQuery(token, MAPBOX_TOKEN, {
              limit: 5,
              signal: ac.signal,
              language: locale,
              ...withoutBbox,
            });
            if (ac.signal.aborted) return;
          }
          // Keep Mapbox's order — that is the typed-text ranking. Only drop
          // hits that break the country or city already selected.
          const shown =
            filters.length === 0
              ? hitsForText
              : hitsForText.filter((h) => decideStack(filters, h) === "allow");
          setHits(shown);
          setActiveIndex(0);
          setLoading(false);
          if (shown.length === 0) setError(t("noResults"));
        })
        .catch((err: unknown) => {
          if (ac.signal.aborted) return;
          setHits([]);
          setLoading(false);
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(t("error"));
        });
    }, 220);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [query, open, locale, t, filters]);

  const commitHit = useCallback(
    (text: string, hit: GeocodeHit) => {
      filterSeq.current += 1;
      const next: PlaceSearchFilter = {
        id: `place-filter-${filterSeq.current}`,
        text: text.trim() || hit.label.split(",")[0]?.trim() || hit.label,
        hit,
      };
      setFilters((prev) => [...prev, next]);
      setQuery("");
      setHits([]);
      setError(null);
      setOpen(true);
      onSelect(toSelect(hit));
    },
    [onSelect],
  );

  const rejectSelection = useCallback(() => {
    setError(null);
    setShaking(false);
    requestAnimationFrame(() => {
      setShaking(true);
      window.setTimeout(() => setShaking(false), 460);
    });
  }, []);

  const tryCommit = useCallback(
    (text: string, hit: GeocodeHit) => {
      if (filters.length > 0 && decideStack(filters, hit) !== "allow") {
        rejectSelection();
        return;
      }
      commitHit(text, hit);
    },
    [commitHit, filters, rejectSelection],
  );

  const submitFirst = useCallback(async () => {
    const token = query.trim();
    if (!token) return;

    const active = hits[activeIndex];
    if (active) {
      tryCommit(token, active);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const scope = recommendationScope(filters);
      const next = await geocodePlaceQuery(token, MAPBOX_TOKEN, {
        limit: 5,
        language: locale,
        ...scope,
      });
      const allowed =
        filters.length === 0
          ? next
          : next.filter((h) => decideStack(filters, h) === "allow");
      const picked = allowed[0] ?? (filters.length === 0 ? pickStackedPlaceHit(next, anchor) : null);
      if (picked) {
        tryCommit(token, picked);
        return;
      }
      if (filters.length > 0) {
        const raw = await geocodePlaceQuery(token, MAPBOX_TOKEN, {
          limit: 5,
          language: locale,
        });
        const allowed = raw.find((h) => decideStack(filters, h) === "allow");
        if (allowed) {
          tryCommit(token, allowed);
          return;
        }
        const conflicts = raw.filter((h) => decideStack(filters, h) === "conflict-country");
        if (conflicts.length > 0) {
          setHits(conflicts);
          setActiveIndex(0);
        }
        if (raw.length > 0) {
          rejectSelection();
          return;
        }
      }
      setError(t("noResults"));
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }, [query, hits, activeIndex, tryCommit, filters, locale, t, anchor, rejectSelection]);

  useEffect(() => {
    if (filters.length === 0) return;
    inputRef.current?.focus();
  }, [filters.length]);

  const removeFilter = useCallback(
    async (id: string) => {
      const index = filters.findIndex((f) => f.id === id);
      if (index < 0) return;
      const next = filters.filter((f) => f.id !== id);
      if (next.length === 0) {
        setFilters([]);
        onClear?.();
        return;
      }
      if (index === filters.length - 1) {
        setFilters(next);
        onSelect(toSelect(next[next.length - 1]!.hit));
        return;
      }

      const anchorHit = next[0]!.hit;
      try {
        const resolved = await geocodePlaceQuery(
          composeStackedPlaceQuery(next.map((f) => f.text)),
          MAPBOX_TOKEN,
          {
            limit: 5,
            language: locale,
            country: anchorHit.countryCode?.toLowerCase(),
            proximity: anchorHit.center,
          },
        );
        const picked =
          pickStackedPlaceHit(resolved, anchorFromHit(anchorHit)) ??
          next[next.length - 1]!.hit;
        const updated = next.map((f, i) =>
          i === next.length - 1 ? { ...f, hit: picked } : f,
        );
        setFilters(updated);
        onSelect(toSelect(picked));
      } catch {
        setFilters(next);
        onSelect(toSelect(next[next.length - 1]!.hit));
      }
    },
    [filters, locale, onClear, onSelect],
  );

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitFirst();
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hits.length === 0) return;
      setActiveIndex((i) => (i + 1) % hits.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (hits.length === 0) return;
      setActiveIndex((i) => (i - 1 + hits.length) % hits.length);
      return;
    }
    if (e.key === "Backspace" && query === "" && filters.length > 0) {
      const last = filters[filters.length - 1];
      if (last) void removeFilter(last.id);
    }
  };

  const activeId = hits[activeIndex] ? `${listId}-${hits[activeIndex]!.id}` : undefined;

  const suggestionList =
    open && hits.length > 0 ? (
      <ul id={listId} className={styles.suggestions} role="listbox">
        {hits.map((hit, index) => (
          <li key={hit.id} role="presentation">
            <button
              type="button"
              id={`${listId}-${hit.id}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`${styles.suggestion} ${
                index === activeIndex ? styles.suggestionActive : ""
              } ${shaking && index === activeIndex ? styles.suggestionShake : ""}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => tryCommit(query.trim() || hit.label, hit)}
            >
              {hit.label}
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  const status =
    open && !loading && error && hits.length === 0 && query.trim().length >= 2 ? (
      <div className={styles.status} role="status">
        {error}
      </div>
    ) : null;

  return (
    <div ref={rootRef} className={styles.row} data-testid="map-place-search">
      <div
        className={`${styles.shell} ${expanded ? styles.shellExpanded : ""} ${
          shaking ? styles.shellShake : ""
        }`}
      >
        <button
          type="button"
          className={`${styles.toggle} ${expanded ? styles.toggleActive : ""}`}
          title={filters.length > 0 && open ? t("clear") : t("open")}
          aria-label={filters.length > 0 && open ? t("clear") : t("open")}
          aria-expanded={expanded}
          onClick={() => {
            if (filters.length > 0 && open) {
              clearAll();
              return;
            }
            if (open && filters.length === 0) {
              collapse();
              return;
            }
            openSearch();
          }}
        >
          {filters.length > 0 && open ? (
            <IconX size={14} stroke={2} aria-hidden />
          ) : (
            <IconSearch size={14} stroke={2} aria-hidden />
          )}
        </button>

        <form
          className={`${styles.field} ${expanded ? styles.fieldVisible : ""}`}
          onSubmit={onFormSubmit}
          aria-hidden={!expanded}
        >
            <input
              ref={inputRef}
              className={styles.input}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onInputKeyDown}
              placeholder={t("placeholder")}
              aria-label={t("placeholder")}
              aria-autocomplete="list"
              aria-controls={listId}
              aria-activedescendant={activeId}
              autoComplete="off"
              spellCheck={false}
              tabIndex={expanded ? 0 : -1}
            />
            {query ? (
              <button
                type="button"
                className={styles.iconBtn}
                title={t("clear")}
                aria-label={t("clear")}
                onClick={() => {
                  setQuery("");
                  setHits([]);
                  setError(null);
                  inputRef.current?.focus();
                }}
              >
                <IconX size={14} stroke={2} aria-hidden />
              </button>
            ) : (
              <span className={styles.iconBtn} aria-hidden>
                <IconCurrentLocation size={14} stroke={1.75} />
              </span>
            )}
          </form>

        {suggestionList}
        {status}
      </div>

      {filters.length > 0 && (
        <ul className={`${styles.pillTrack} ${styles.pills}`} aria-label={t("filters")}>
          {[...filters].reverse().map((filter) => (
            <li key={filter.id} className={styles.pill}>
              <span className={styles.pillText}>{filter.text}</span>
              <button
                type="button"
                className={styles.pillRemove}
                title={t("removeFilter", { label: filter.text })}
                aria-label={t("removeFilter", { label: filter.text })}
                onClick={() => void removeFilter(filter.id)}
              >
                <IconX size={10} stroke={2.5} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
