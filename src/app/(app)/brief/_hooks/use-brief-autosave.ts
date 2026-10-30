"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";
import type { Brief } from "~/lib/brief/types";
import { textPatch, type BriefText } from "~/lib/brief/autosave";
import { createOrderedSaver, type OrderedSaver } from "~/lib/brief/ordered-saver";
import type { Saver } from "./use-save-tracker";

export type { BriefText };

/** How long typing must pause before a draft's text is saved. */
export const AUTOSAVE_DELAY_MS = 800;

type SavedText = BriefText & { updatedAt: string };

/**
 * The Brief's title, summary and closing notes as the composer edits them,
 * saved to clear-api 800 ms after typing stops, when the page asks
 * (`flushAll`) and on leaving. Saves are ordered and only a success marks
 * the text saved (see `createOrderedSaver`).
 */
export function useBriefAutosave(brief: Brief, { track, setDirty, registerFlush }: Saver) {
  const t = useTranslations("brief");
  const utils = api.useUtils();
  const update = api.briefs.update.useMutation();
  const editable = brief.status === "draft";
  const briefId = brief.id;
  const [text, setText] = useState<BriefText>(() => ({
    title: brief.title,
    summary: brief.summary,
    closingNotes: brief.closingNotes,
  }));

  // What the saver calls, kept current through a ref.
  const deps = useRef({ track, setDirty, update, utils, t });
  deps.current = { track, setDirty, update, utils, t };

  const [saver] = useState<OrderedSaver<BriefText>>(() =>
    createOrderedSaver<BriefText, SavedText | null>({
      initial: text,
      // A blank title is never sent (clear-api refuses it), so it counts as unchanged.
      same: (a, b) => textPatch(a, b) === null,
      // Only the fields that differ from what clear-api last confirmed, so a
      // field saved from another tab isn't overwritten with an older copy.
      save: async (value, confirmed) => {
        const patch = textPatch(value, confirmed);
        return patch ? deps.current.update.mutateAsync({ id: briefId, ...patch }) : null;
      },
      onSaved: (row, _value, latest) => {
        if (!row || !latest) return;
        deps.current.utils.briefs.get.setData({ id: briefId }, (old) =>
          old ? { ...old, title: row.title, summary: row.summary, closingNotes: row.closingNotes, updatedAt: row.updatedAt } : old,
        );
      },
      onError: (err) =>
        notifications.show({
          color: "red",
          message: deps.current.t("composer.saveError", { message: err instanceof Error ? err.message : String(err) }),
        }),
      track: (work) => deps.current.track(work),
      setDirty: (dirty) => deps.current.setDirty("text", dirty),
    }),
  );

  const flush = useCallback(() => {
    if (editable) saver.flush();
  }, [editable, saver]);

  useEffect(() => {
    if (!editable) return;
    saver.set(text);
    const timer = setTimeout(flush, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, editable, saver, flush]);

  useEffect(() => registerFlush("text", flush), [registerFlush, flush]);

  // Leaving the page saves what was typed since the last pause.
  useEffect(() => () => flush(), [flush]);

  const setField = useCallback((field: keyof BriefText, value: string) => setText((prev) => ({ ...prev, [field]: value })), []);

  return { text, setField, flush };
}
