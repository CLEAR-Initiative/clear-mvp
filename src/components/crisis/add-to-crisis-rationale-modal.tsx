"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Group, Modal, Text } from "@mantine/core";
import { isValidCrisisRationale } from "~/lib/crisis/rationale";
import { CrisisRationaleField } from "./crisis-rationale-field";

interface AddToCrisisRationaleModalProps {
  opened: boolean;
  onClose: () => void;
  /** The crisis the events join; null while none is chosen. */
  crisisTitle: string | null;
  eventCount: number;
  pending: boolean;
  /** Sends the add with the trimmed rationale. */
  onConfirm: (rationale: string) => void;
}

/**
 * Asks why the chosen events belong in an existing crisis before they are
 * added. clear-api refuses an add without a rationale and records it with who
 * decided and when. One rationale covers every event in a bulk add.
 */
export function AddToCrisisRationaleModal({
  opened,
  onClose,
  crisisTitle,
  eventCount,
  pending,
  onConfirm,
}: AddToCrisisRationaleModalProps) {
  const t = useTranslations("eventDetail.addToCrisis");
  const [rationale, setRationale] = useState("");

  useEffect(() => {
    if (opened) setRationale("");
  }, [opened]);

  const canSubmit = isValidCrisisRationale(rationale) && !pending;

  return (
    <Modal opened={opened} onClose={onClose} title={t("rationaleModalTitle")} centered>
      <Text size="sm" c="var(--color-text-secondary)" mb={12}>
        {t("rationaleModalHint", { count: eventCount, title: crisisTitle ?? t("untitledCrisis") })}
      </Text>
      <CrisisRationaleField value={rationale} onChange={setRationale} mode="add" autoFocus />
      <Group justify="flex-end" mt={16}>
        <Button variant="subtle" color="gray" onClick={onClose} disabled={pending}>
          {t("cancel")}
        </Button>
        <Button
          onClick={() => canSubmit && onConfirm(rationale.trim())}
          loading={pending}
          disabled={!canSubmit}
          data-testid="crisis-rationale-confirm"
        >
          {t("confirmAdd")}
        </Button>
      </Group>
    </Modal>
  );
}
