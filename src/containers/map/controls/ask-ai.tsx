"use client";

import { UnstyledButton } from "@mantine/core";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { trackAgentOpened } from "~/components/agent/agent-analytics";
import { useAgent } from "~/components/agent/agent-provider";
import classes from "./ask-ai.module.css";

export function AskAiButton() {
  const t = useTranslations("mapV2.controls");
  const { available, setOpen } = useAgent();
  const pathname = usePathname();

  if (!available) return null;

  return (
    <UnstyledButton
      className={classes.button}
      onClick={() => {
        trackAgentOpened("drawer", pathname);
        setOpen(true);
      }}
    >
      <span className={classes.label}>{t("askAi")}</span>
      <Image className={classes.icon} src="/images/map-v2/ask-ai/sparkles.svg" alt="" width={16} height={16} />
      <Image className={classes.iconHover} src="/images/map-v2/ask-ai/sparkles-hover.svg" alt="" width={16} height={16} />
    </UnstyledButton>
  );
}
