"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";
import type { Brief } from "~/lib/brief/types";
import type { TrackSave } from "./use-brief-items";
import type { SetDirty } from "./use-save-tracker";
import { textPatch, type BriefText } from "~/lib/brief/autosave";

export type { BriefText };

/** How long typing must pause before a draft's text is saved. */
export const AUTOSAVE_DELAY_MS = 800;

/**
 * The Brief's title, summary and closing notes as the composer edits them,
 * saved to clear-api 800 ms after typing stops, and on leaving the page.
 */
export function useBriefAutosave(brief: Brief, track: TrackSave, setDirty: SetDirty) {
  const t = useTranslations("brief");
  const utils = api.useUtils();
  const update = api.briefs.update.useMutation();
  const [text, setText] = useState<BriefText>(() => ({
    title: brief.title,
    summary: brief.summary,
    closingNotes: brief.closingNotes,
  }));
  const saved = useRef<BriefText>(text);
  const latest = useRef(text);
  latest.current = text;
  const editable = brief.status === "draft";
  const briefId = brief.id;

  // Saves go out one at a time, in order, so clear-api always ends on the
  // newest text; only the newest save's answer is written to the cache.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const seq = useRef(0);

  const flush = useCallback((): Promise<void> => {
    const patch = textPatch(latest.current, saved.current);
    if (!patch || !editable) return queue.current.then(() => undefined);
    const before = saved.current;
    saved.current = { ...saved.current, ...patch };
    setDirty("text", false);
    const mine = ++seq.current;
    const run = () => update.mutateAsync({ id: briefId, ...patch });
    const work = track(queue.current.then(run, run))
      .then((row) => {
        if (mine !== seq.current) return;
        utils.briefs.get.setData({ id: briefId }, (old) =>
          old ? { ...old, title: row.title, summary: row.summary, closingNotes: row.closingNotes, updatedAt: row.updatedAt } : old,
        );
      })
      .catch((err: unknown) => {
        // Put back what clear-api still holds, so the next edit sends it again.
        saved.current = { ...saved.current, ...pick(before, patch) };
        setDirty("text", true);
        notifications.show({
          color: "red",
          message: t("composer.saveError", { message: err instanceof Error ? err.message : String(err) }),
        });
      });
    queue.current = work;
    return work;
  }, [briefId, editable, setDirty, t, track, update, utils]);

  useEffect(() => {
    const pending = editable && !!textPatch(text, saved.current);
    setDirty("text", pending);
    if (!pending) return;
    const timer = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, flush, editable, setDirty]);

  // Leaving the page saves what was typed since the last pause.
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => () => void flushRef.current(), []);

  const setField = useCallback((field: keyof BriefText, value: string) => setText((prev) => ({ ...prev, [field]: value })), []);

  return { text, setField, flush };
}

function pick(from: BriefText, keys: Partial<BriefText>): Partial<BriefText> {
  return Object.fromEntries(Object.keys(keys).map((k) => [k, from[k as keyof BriefText]]));
}
