"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ActionIcon, Badge, Box, Group, Stack, Text, TextInput, Tooltip, UnstyledButton } from "@mantine/core";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { IconGripVertical, IconX } from "@tabler/icons-react";
import { SeverityBadge } from "~/components/ui";
import type { BriefItem, BriefItemKind } from "~/lib/brief/types";
import type { ViewGroup, ViewItem } from "~/lib/brief/view";
import { groupItems, isPendingItem, type BriefItemsApi } from "../_hooks/use-brief-items";
import { AUTOSAVE_DELAY_MS } from "../_hooks/use-brief-autosave";
import { itemPreviewTarget, type PreviewTarget } from "../_lib/preview-target";
import { MarkdownLite } from "./markdown-lite";
import { createOrderedSaver } from "~/lib/brief/ordered-saver";
import type { Saver } from "../_hooks/use-save-tracker";

/**
 * Picked items, Alerts → Events → Signals. On a draft each group is a drag
 * list with a note and a remove button per item; a sent Brief shows the
 * items as they were sent.
 */
export function BriefItems({
  groups,
  items,
  rawItems,
  editable,
  onPreview,
  saver,
}: {
  groups: ViewGroup[];
  items: BriefItemsApi;
  /** The Brief's items, for the actions the view model doesn't carry. */
  rawItems: BriefItem[];
  editable: boolean;
  onPreview: (target: PreviewTarget) => void;
  saver: Saver;
}) {
  const t = useTranslations("brief");
  const byId = new Map(rawItems.map((i) => [i.id, i]));

  const onDragEnd = ({ source, destination }: DropResult) => {
    if (!destination || destination.droppableId !== source.droppableId) return;
    items.reorder(source.droppableId as BriefItemKind, source.index, destination.index);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Stack gap={14}>
        {groups.map((group) => {
          const hasPending = groupItems(rawItems, group.kind).some(isPendingItem);
          return (
            <Stack key={group.kind} gap={6} data-testid={`brief-group-${group.kind}`}>
              <Text size="xs" fw={700} tt="uppercase" c="var(--color-text-muted)">
                {group.label} ({group.items.length})
              </Text>
              {group.items.length === 0 ? (
                <Text size="sm" c="var(--color-text-muted)">
                  {editable ? t("items.emptyGroup") : t("items.noneSent")}
                </Text>
              ) : (
                <Droppable droppableId={group.kind} isDropDisabled={!editable}>
                  {(drop) => (
                    <Stack gap={6} ref={drop.innerRef} {...drop.droppableProps}>
                      {group.items.map((view, index) => {
                        const item = byId.get(view.id);
                        if (!item) return null;
                        return (
                          <Draggable
                            key={view.id}
                            draggableId={view.id}
                            index={index}
                            isDragDisabled={!editable || hasPending}
                          >
                            {(drag, snapshot) => (
                              <Box
                                ref={drag.innerRef}
                                {...drag.draggableProps}
                                p={10}
                                style={{
                                  ...drag.draggableProps.style,
                                  display: "flex",
                                  gap: 8,
                                  border: "1px solid var(--color-border)",
                                  borderInlineStart: "3px solid var(--color-accent)",
                                  borderRadius: 4,
                                  background: snapshot.isDragging ? "var(--color-bg-muted)" : "var(--color-bg-white)",
                                }}
                                data-testid="brief-item"
                                data-key={view.key}
                              >
                                {editable && (
                                  <Box
                                    {...drag.dragHandleProps}
                                    aria-label={t("items.drag", { title: view.title })}
                                    style={{ display: "flex", cursor: "grab", color: "var(--color-text-muted)", paddingTop: 2 }}
                                  >
                                    <IconGripVertical size={14} />
                                  </Box>
                                )}
                                <ItemBody
                                  view={view}
                                  item={item}
                                  editable={editable}
                                  items={items}
                                  onPreview={onPreview}
                                  saver={saver}
                                />
                              </Box>
                            )}
                          </Draggable>
                        );
                      })}
                      {drop.placeholder}
                    </Stack>
                  )}
                </Droppable>
              )}
            </Stack>
          );
        })}
      </Stack>
    </DragDropContext>
  );
}

function ItemBody({
  view,
  item,
  editable,
  items,
  onPreview,
  saver,
}: {
  view: ViewItem;
  item: BriefItem;
  editable: boolean;
  items: BriefItemsApi;
  onPreview: (target: PreviewTarget) => void;
  saver: Saver;
}) {
  const t = useTranslations("brief");
  const target = itemPreviewTarget(item);
  const pending = isPendingItem(item);
  const title = (
    <Text size="sm" fw={600} c="var(--color-text-primary)" style={{ lineHeight: 1.35 }} data-testid="brief-item-title">
      {view.title}
    </Text>
  );
  return (
    <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
      <Group gap={6} wrap="nowrap" align="flex-start" justify="space-between">
        {target && !pending ? (
          <UnstyledButton onClick={() => onPreview(target)} style={{ textAlign: "start" }}>
            {title}
          </UnstyledButton>
        ) : (
          title
        )}
        {editable && (
          <Tooltip label={t("items.remove")}>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              aria-label={t("items.removeLabel", { title: view.title })}
              disabled={pending}
              onClick={() => items.removeItem(item)}
            >
              <IconX size={12} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
      <Group gap={6} wrap="wrap">
        <SeverityBadge severity={view.severity} label={view.severityLabel} />
        {view.earlier && (
          <Badge
            size="sm"
            variant="light"
            style={{ background: "var(--color-info-light)", color: "var(--color-info)", textTransform: "none" }}
            data-testid="brief-item-earlier"
          >
            {view.earlier}
          </Badge>
        )}
        <Text size="xs" c="var(--color-text-secondary)">
          {[view.locationName, view.types.join(", ") || null, view.occurredLabel].filter(Boolean).join(" · ")}
        </Text>
      </Group>
      {editable ? (
        <ItemNote item={item} disabled={pending} onSave={items.updateNote} saver={saver} />
      ) : (
        view.note && (
          <Box pt={2}>
            <MarkdownLite text={view.note} size={13} />
          </Box>
        )
      )}
    </Stack>
  );
}

/** The analyst's note on an item: saved after a pause in typing and on leaving the field. */
function ItemNote({
  item,
  disabled,
  onSave,
  saver,
}: {
  item: BriefItem;
  disabled: boolean;
  onSave: (item: BriefItem, note: string) => Promise<void>;
  saver: Saver;
}) {
  const t = useTranslations("brief");
  const [value, setValue] = useState(item.note ?? "");
  const { setDirty, track, registerFlush } = saver;
  const dirtyKey = `note:${item.id}`;
  // What the saver calls, kept current through a ref.
  const deps = useRef({ item, onSave, setDirty, track });
  deps.current = { item, onSave, setDirty, track };
  // Ordered saves; only a success marks the note saved (see createOrderedSaver).
  const [noteSaver] = useState(() =>
    createOrderedSaver<string, void>({
      initial: item.note ?? "",
      same: (a, b) => a === b,
      save: (note) => deps.current.onSave(deps.current.item, note),
      track: (work) => deps.current.track(work),
      setDirty: (dirty) => deps.current.setDirty(dirtyKey, dirty),
    }),
  );
  const flush = useCallback(() => noteSaver.flush(), [noteSaver]);

  useEffect(() => registerFlush(dirtyKey, flush), [registerFlush, dirtyKey, flush]);

  useEffect(() => {
    noteSaver.set(value);
    const timer = setTimeout(flush, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [value, noteSaver, flush]);

  // Leaving the page saves what was typed; a removed item's note goes nowhere.
  useEffect(
    () => () => {
      flush();
      deps.current.setDirty(dirtyKey, false);
    },
    [flush, dirtyKey],
  );

  return (
    <TextInput
      size="xs"
      value={value}
      disabled={disabled}
      placeholder={t("items.notePlaceholder")}
      aria-label={t("items.noteLabel", { title: item.snapshot.title })}
      onChange={(e) => setValue(e.currentTarget.value)}
      onBlur={flush}
      data-testid="brief-item-note"
    />
  );
}
