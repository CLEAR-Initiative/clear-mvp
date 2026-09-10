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
import styles from "./map-place-search.module.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export type MapPlaceSearchSelect = GeocodeHit & { zoom: number };

type MapPlaceSearchProps = {
  onSelect: (hit: MapPlaceSearchSelect) => void;
};

export function MapPlaceSearch({ onSelect }: MapPlaceSearchProps) {
  const t = useTranslations("map.placeSearch");
  const locale = useLocale();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    abortRef.current?.abort();
    setOpen(false);
    setQuery("");
    setHits([]);
    setActiveIndex(0);
    setLoading(false);
    setError(null);
  }, []);

  const openSearch = useCallback(() => {
    setOpen(true);
    setError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
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

    const timer = window.setTimeout(() => {
      void geocodePlaceQuery(q, MAPBOX_TOKEN, {
        limit: 5,
        signal: ac.signal,
        language: locale,
      })
        .then((next) => {
          if (ac.signal.aborted) return;
          setHits(next);
          setActiveIndex(0);
          setLoading(false);
          if (next.length === 0) setError(t("noResults"));
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
  }, [query, open, locale, t]);

  const commit = useCallback(
    (hit: GeocodeHit) => {
      onSelect({
        ...hit,
        zoom: zoomForPlaceTypes(hit.placeTypes),
      });
      close();
    },
    [onSelect, close],
  );

  const submitFirst = useCallback(async () => {
    const q = query.trim();
    if (!q) return;

    if (hits[activeIndex]) {
      commit(hits[activeIndex]!);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const next = await geocodePlaceQuery(q, MAPBOX_TOKEN, {
        limit: 1,
        language: locale,
      });
      if (next[0]) {
        commit(next[0]);
        return;
      }
      setError(t("noResults"));
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }, [query, hits, activeIndex, commit, locale, t]);

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
  };

  return (
    <div
      ref={rootRef}
      className={`${styles.shell} ${open ? styles.shellExpanded : ""}`}
      data-testid="map-place-search"
    >
      <button
        type="button"
        className={`${styles.toggle} ${open ? styles.toggleActive : ""}`}
        title={t("open")}
        aria-label={t("open")}
        aria-expanded={open}
        onClick={() => (open ? close() : openSearch())}
      >
        <IconSearch size={14} stroke={2} aria-hidden />
      </button>

      <form
        className={`${styles.field} ${open ? styles.fieldVisible : ""}`}
        onSubmit={onFormSubmit}
        aria-hidden={!open}
      >
        <input
          ref={inputRef}
          className={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={
            hits[activeIndex] ? `${listId}-${hits[activeIndex]!.id}` : undefined
          }
          autoComplete="off"
          spellCheck={false}
          tabIndex={open ? 0 : -1}
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

      {open && hits.length > 0 && (
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
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(hit)}
              >
                {hit.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && error && hits.length === 0 && query.trim().length >= 2 && (
        <div className={styles.status} role="status">
          {error}
        </div>
      )}
    </div>
  );
}
