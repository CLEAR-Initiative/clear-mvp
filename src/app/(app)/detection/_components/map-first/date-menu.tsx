"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { DATE_PRESETS, dateOfKey, daysOf, type DateKey } from "../../_lib/detection-model";
import { rangeOfKey } from "../../_hooks/use-detection-url-sync";
import css from "./map-first.module.css";

interface DateMenuProps {
  /** The range as the page words it everywhere ("Last 7 days", "3 Aug – 14 Sept"). */
  label: string;
  /** The current date key, when the range is a rolling "last N days". */
  dateKey: DateKey | null;
  isDefault: boolean;
  /** The range's bounds (ISO), which prefill the custom days. */
  fromIso: string;
  toIso: string;
  /** Set while the timeline's handles are dragged: this is the value they change. */
  linked?: boolean;
  onPreset: (key: DateKey) => void;
  /** A from-to of whole UTC days; it may reach back past the timeline. */
  onCustomRange: (range: { from: string; to: string }) => void;
  /** Pointed at, focused or open: the timeline marks itself as the same filter. */
  onActiveChange?: (active: boolean) => void;
}

const dayOf = (iso: string) => iso.slice(0, 10);

/**
 * The date filter where the feed states it: the range in the count line is a
 * button, and its menu holds the presets and a custom from-to. The timeline
 * shows and changes the same range.
 */
export function DateMenu({ label, dateKey, isDefault, fromIso, toIso, linked, onPreset, onCustomRange, onActiveChange }: DateMenuProps) {
  const t = useTranslations("detection.mapFirst");
  const [open, setOpen] = useState(false);
  const [pointed, setPointed] = useState(false);
  const [fromDay, setFromDay] = useState("");
  const [toDay, setToDay] = useState("");
  const wrapRef = useRef<HTMLSpanElement>(null);
  const today = dayOf(new Date().toISOString());

  const toggle = () => {
    if (!open) {
      setFromDay(dayOf(fromIso));
      setToDay(dayOf(toIso) > today ? today : dayOf(toIso));
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
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

  const active = open || pointed;
  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);
  useEffect(() => () => onActiveChange?.(false), [onActiveChange]);

  const custom = fromDay && toDay && toDay <= today ? rangeOfKey(`${fromDay}..${toDay}`) : null;

  return (
    <span ref={wrapRef} className={css.dateWrap}>
      <button
        type="button"
        className={css.dateButton}
        data-testid="feed-date-trigger"
        data-active={!isDefault || undefined}
        data-linked={linked || open || undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t("date.change")}
        onClick={toggle}
        onPointerEnter={() => setPointed(true)}
        onPointerLeave={() => setPointed(false)}
        onFocus={() => setPointed(true)}
        onBlur={() => setPointed(false)}
      >
        <span>{label}</span>
        <IconChevronDown size={13} color="var(--color-text-muted)" />
      </button>
      {open && (
        <div className={css.dateMenu} role="menu" aria-label={t("qb.keys.since")}>
          <div className={css.ddBody}>
            <div className={css.groupHeader}>{t("qb.keys.since")}</div>
            {DATE_PRESETS.map((key) => {
              const days = daysOf(dateOfKey(key) ?? "") ?? 0;
              return (
                <button
                  key={key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={dateKey === key}
                  className={css.sortOption}
                  data-testid={`feed-date-${key}`}
                  onClick={() => {
                    onPreset(key);
                    setOpen(false);
                  }}
                >
                  {days === 1 ? t("last24h") : t("lastDays", { count: days })}
                  {dateKey === key && <IconCheck size={15} color="var(--color-accent)" className={css.sortCheck} />}
                </button>
              );
            })}
            <div className={css.groupHeader}>{t("date.custom")}</div>
            <form
              className={css.dateCustom}
              onSubmit={(e) => {
                e.preventDefault();
                if (!custom) return;
                onCustomRange(custom);
                setOpen(false);
              }}
            >
              <label className={css.dateField}>
                <span>{t("date.from")}</span>
                <input
                  type="date"
                  value={fromDay}
                  max={toDay || today}
                  onChange={(e) => setFromDay(e.currentTarget.value)}
                  data-testid="feed-date-from"
                />
              </label>
              <label className={css.dateField}>
                <span>{t("date.to")}</span>
                <input
                  type="date"
                  value={toDay}
                  min={fromDay || undefined}
                  max={today}
                  onChange={(e) => setToDay(e.currentTarget.value)}
                  data-testid="feed-date-to"
                />
              </label>
              <button type="submit" className={css.dateApply} disabled={!custom} data-testid="feed-date-apply">
                {t("date.apply")}
              </button>
            </form>
          </div>
        </div>
      )}
    </span>
  );
}
