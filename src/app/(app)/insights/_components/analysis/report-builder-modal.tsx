"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Button, Checkbox, Group, Modal, Stack, Text } from "@mantine/core";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { IconGripVertical } from "@tabler/icons-react";
import { moveItem, type ReportSectionChoice } from "~/lib/analysis-report";

/**
 * Mini report builder: the report's sections as cards the reader drags into
 * order and ticks in or out before the PDF is made.
 */
export function ReportBuilderModal({
  opened,
  onClose,
  initial,
  busy,
  onCreate,
}: {
  opened: boolean;
  onClose: () => void;
  initial: ReportSectionChoice[];
  busy: boolean;
  onCreate: (sections: ReportSectionChoice[]) => void;
}) {
  const t = useTranslations("analysis.report");
  const [sections, setSections] = useState(initial);

  // Start from the analysis' current content each time the builder opens, but
  // keep the reader's choices when that content changes while it is open.
  const [wasOpened, setWasOpened] = useState(opened);
  if (opened !== wasOpened) {
    setWasOpened(opened);
    if (opened) setSections(initial);
  }

  const onDragEnd = ({ source, destination }: DropResult) => {
    if (destination) setSections((s) => moveItem(s, source.index, destination.index));
  };
  const toggle = (key: string) =>
    setSections((s) => s.map((x) => (x.key === key && x.available ? { ...x, included: !x.included } : x)));
  const includedCount = sections.filter((x) => x.included).length;

  const hint = ({ key, count }: ReportSectionChoice): string => {
    const n = count ?? 0;
    switch (key) {
      case "currentStatus":
        return t("builder.hints.currentStatus");
      case "outlook":
        return t("builder.hints.outlook");
      case "keyDevelopments":
        return t("builder.counts.keyDevelopments", { count: n });
      case "map":
        return t("builder.counts.map", { count: n });
      case "contexts":
        return t("builder.counts.contexts", { count: n });
      case "hazards":
        return t("builder.counts.hazards", { count: n });
      case "displacement":
        return t("builder.counts.displacement", { count: n });
      case "priorityNeeds":
        return t("builder.counts.priorityNeeds", { count: n });
      case "responseActivities":
        return t("builder.counts.responseActivities", { count: n });
      case "sources":
        return t("builder.counts.sources", { count: n });
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={<Text fw={700}>{t("builder.title")}</Text>} size="lg">
      <Text c="var(--color-text-secondary)" mb={12} style={{ fontSize: 13 }}>
        {t("builder.intro")}
      </Text>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="report-sections">
          {(drop) => (
            <Stack gap={6} ref={drop.innerRef} {...drop.droppableProps} data-testid="report-builder-list">
              {sections.map((x, index) => (
                <Draggable key={x.key} draggableId={x.key} index={index}>
                  {(drag, snapshot) => (
                    <Box
                      ref={drag.innerRef}
                      {...drag.draggableProps}
                      px={12}
                      py={10}
                      style={{
                        ...drag.draggableProps.style,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        border: "1px solid var(--color-border)",
                        background: snapshot.isDragging ? "var(--color-bg-muted)" : "var(--color-bg-white)",
                        boxShadow: snapshot.isDragging ? "var(--shadow-md)" : undefined,
                        opacity: x.available ? 1 : 0.55,
                      }}
                      data-testid={`report-section-${x.key}`}
                    >
                      <Box
                        {...drag.dragHandleProps}
                        aria-label={t("builder.dragLabel", { section: t(`sections.${x.key}`) })}
                        style={{ display: "flex", cursor: "grab", color: "var(--color-text-muted)" }}
                      >
                        <IconGripVertical size={16} />
                      </Box>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
                          {t(`sections.${x.key}`)}
                        </Text>
                        <Text c="var(--color-text-muted)" style={{ fontSize: 12 }}>
                          {x.available ? hint(x) : t("builder.empty")}
                        </Text>
                      </Box>
                      <Checkbox
                        checked={x.included}
                        disabled={!x.available}
                        onChange={() => toggle(x.key)}
                        aria-label={t("builder.includeLabel", { section: t(`sections.${x.key}`) })}
                        data-testid={`report-include-${x.key}`}
                      />
                    </Box>
                  )}
                </Draggable>
              ))}
              {drop.placeholder}
            </Stack>
          )}
        </Droppable>
      </DragDropContext>

      <Text c="var(--color-text-muted)" mt={10} style={{ fontSize: 12 }}>
        {t("builder.alwaysIncluded")}
      </Text>

      <Group justify="flex-end" mt={16}>
        <Button variant="default" onClick={onClose}>
          {t("builder.cancel")}
        </Button>
        <Button
          color="dark"
          disabled={includedCount === 0}
          loading={busy}
          onClick={() => onCreate(sections)}
          data-testid="report-builder-create"
        >
          {t("builder.create", { count: includedCount })}
        </Button>
      </Group>
    </Modal>
  );
}
