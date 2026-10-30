"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import type { Brief } from "~/lib/brief/types";
import { toBriefView } from "~/lib/brief/view";
import { copyBrief } from "~/lib/brief/clipboard";
import { useBriefTextLabels, useBriefViewLabels } from "../_hooks/use-brief-view-labels";

/** "Copy": the Brief on the clipboard as rich text, to paste into an email or a document. */
export function BriefCopyButton({ beforeCopy }: { beforeCopy: () => Promise<Brief | null> }) {
  const t = useTranslations("brief.copy");
  const viewLabels = useBriefViewLabels();
  const textLabels = useBriefTextLabels();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      // The server's copy, read back after every edit saved.
      const brief = await beforeCopy();
      if (!brief) return;
      const how = await copyBrief(toBriefView(brief, viewLabels), textLabels);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (how === "plain") notifications.show({ message: t("plainOnly") });
    } catch (e) {
      console.error("[brief] copy failed", e);
      notifications.show({ color: "red", message: t("error") });
    }
  }

  return (
    <Button
      size="xs"
      variant="default"
      leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
      onClick={() => void copy()}
      data-testid="brief-copy"
    >
      {copied ? t("done") : t("button")}
    </Button>
  );
}
