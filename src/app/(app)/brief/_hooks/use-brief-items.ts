"use client";

import { useCallback, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";
import {
  briefItemKey,
  type Brief,
  type BriefItem,
  type BriefItemKind,
  type BriefItemSnapshot,
} from "~/lib/brief/types";
import type { HistoryRow } from "../../detection/_components/history-tab";
import { provisionalSnapshot, rowEntity } from "../_lib/row-snapshot";

/** Wraps a save so the page can show "Saving…" while it runs. */
export type TrackSave = <T>(work: Promise<T>) => Promise<T>;
const untracked: TrackSave = (work) => work;

const PENDING_PREFIX = "pending:";

/** An item the page shows before clear-api has answered the add. */
export function isPendingItem(item: Pick<BriefItem, "id">): boolean {
  return item.id.startsWith(PENDING_PREFIX);
}

export interface BriefItemsApi {
  /** `briefItemKey` of every picked item, including adds still in flight. Same strings as `historyRowKey`. */
  pickedKeys: Set<string>;
  /** Tick or untick a History row (HistoryTab's `selection.onToggle`). */
  toggle: (row: HistoryRow) => void;
  /**
   * Pick an entity by kind and id. `preview` is shown until clear-api returns
   * the snapshot it built. A key already picked is left alone.
   */
  addItem: (kind: BriefItemKind, entityId: string, preview?: BriefItemSnapshot) => void;
  removeItem: (item: BriefItem) => void;
  /** Save an item's note; blank clears it. Resolves once clear-api has it. */
  updateNote: (item: BriefItem, note: string) => Promise<void>;
  /** Move an item within its kind group, from one index to another. */
  reorder: (kind: BriefItemKind, from: number, to: number) => void;
}

/** A kind's items in their Brief order. */
export function groupItems(items: BriefItem[], kind: BriefItemKind): BriefItem[] {
  return items.filter((i) => i.kind === kind).sort((a, b) => a.position - b.position);
}

/**
 * The Brief's picked items, edited optimistically in the `briefs.get` cache:
 * the list ticks at once, and a refused add or remove is rolled back with a
 * notice.
 */
export function useBriefItems(brief: Brief, { track = untracked }: { track?: TrackSave } = {}): BriefItemsApi {
  const t = useTranslations("brief");
  const tHistory = useTranslations("detection.history");
  const utils = api.useUtils();
  const add = api.briefs.addItem.useMutation();
  const remove = api.briefs.removeItem.useMutation();
  const saveNote = api.briefs.updateItemNote.useMutation();
  const reorderItems = api.briefs.reorderItems.useMutation();
  const briefId = brief.id;
  // Keys whose add or remove is still in flight: a second click waits.
  const inFlight = useRef(new Set<string>());

  const pickedKeys = useMemo(() => new Set(brief.items.map(briefItemKey)), [brief.items]);

  const setItems = useCallback(
    (update: (items: BriefItem[]) => BriefItem[]) =>
      utils.briefs.get.setData({ id: briefId }, (old) => (old ? { ...old, items: update(old.items) } : old)),
    [utils, briefId],
  );

  const addItem = useCallback(
    (kind: BriefItemKind, entityId: string, preview?: BriefItemSnapshot) => {
      const key = briefItemKey({ kind, entityId });
      if (inFlight.current.has(key) || pickedKeys.has(key)) return;
      inFlight.current.add(key);
      const now = new Date().toISOString();
      const pendingId = `${PENDING_PREFIX}${key}`;
      setItems((items) => [
        ...items,
        {
          id: pendingId,
          briefId,
          kind,
          entityId,
          position: items.filter((i) => i.kind === kind).length,
          note: null,
          snapshot: preview ?? { title: "", severity: null, locationName: null, eventTypes: [], occurredAt: now, url: "" },
          createdAt: now,
          updatedAt: now,
        },
      ]);
      void track(add.mutateAsync({ briefId, kind, entityId }))
        .then((item) => setItems((items) => items.map((i) => (i.id === pendingId ? item : i))))
        .catch((err: unknown) => {
          setItems((items) => items.filter((i) => i.id !== pendingId));
          notifications.show({ color: "red", message: t("items.addError", { message: errorMessage(err) }) });
        })
        .finally(() => inFlight.current.delete(key));
    },
    [add, briefId, pickedKeys, setItems, t, track],
  );

  const removeItem = useCallback(
    (item: BriefItem) => {
      const key = briefItemKey(item);
      if (inFlight.current.has(key) || isPendingItem(item)) return;
      inFlight.current.add(key);
      setItems((items) => items.filter((i) => i.id !== item.id));
      void track(remove.mutateAsync({ itemId: item.id }))
        .catch((err: unknown) => {
          setItems((items) => (items.some((i) => i.id === item.id) ? items : [...items, item]));
          notifications.show({ color: "red", message: t("items.removeError", { message: errorMessage(err) }) });
        })
        .finally(() => inFlight.current.delete(key));
    },
    [remove, setItems, t, track],
  );

  const toggle = useCallback(
    (row: HistoryRow) => {
      const { kind, entityId } = rowEntity(row);
      const picked = brief.items.find((i) => i.kind === kind && i.entityId === entityId);
      if (picked) removeItem(picked);
      else addItem(kind, entityId, provisionalSnapshot(row, tHistory("untitled")));
    },
    [brief.items, addItem, removeItem, tHistory],
  );

  const updateNote = useCallback(
    async (item: BriefItem, note: string) => {
      // A removed item's note has nowhere to go.
      const stillPicked = utils.briefs.get.getData({ id: briefId })?.items.some((i) => i.id === item.id);
      if (isPendingItem(item) || !stillPicked) return;
      try {
        const saved = await track(saveNote.mutateAsync({ itemId: item.id, note: note.trim() ? note : null }));
        setItems((items) => items.map((i) => (i.id === saved.id ? { ...i, note: saved.note, updatedAt: saved.updatedAt } : i)));
      } catch (err) {
        notifications.show({ color: "red", message: t("items.noteError", { message: errorMessage(err) }) });
        throw err;
      }
    },
    [briefId, saveNote, setItems, t, track, utils],
  );

  const reorder = useCallback(
    (kind: BriefItemKind, from: number, to: number) => {
      if (from === to) return;
      const group = groupItems(brief.items, kind);
      // clear-api wants the whole group: wait until every add in it has landed.
      if (group.some(isPendingItem) || !group[from]) return;
      const moved = [...group];
      const [item] = moved.splice(from, 1);
      moved.splice(to, 0, item!);
      const before = new Map(group.map((i) => [i.id, i.position]));
      const apply = (position: (i: BriefItem) => number) =>
        setItems((items) => items.map((i) => (i.kind === kind ? { ...i, position: position(i) } : i)));
      const order = new Map(moved.map((i, index) => [i.id, index]));
      apply((i) => order.get(i.id) ?? i.position);
      void track(reorderItems.mutateAsync({ briefId, kind, itemIds: moved.map((i) => i.id) })).catch((err: unknown) => {
        apply((i) => before.get(i.id) ?? i.position);
        notifications.show({ color: "red", message: t("items.reorderError", { message: errorMessage(err) }) });
      });
    },
    [brief.items, briefId, reorderItems, setItems, t, track],
  );

  return { pickedKeys, toggle, addItem, removeItem, updateNote, reorder };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
