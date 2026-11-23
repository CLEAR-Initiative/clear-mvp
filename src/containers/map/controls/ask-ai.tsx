"use client";

import { Tooltip, UnstyledButton } from "@mantine/core";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { trackAgentOpened } from "~/components/agent/agent-analytics";
import { useAgent } from "~/components/agent/agent-provider";
import classes from "./ask-ai.module.css";

export function AskAiButton() {
  const t = useTranslations("mapV2.controls");
  const { available, setOpen } = useAgent();
  const pathname = usePathname();

  if (!available) return null;

  return (
    <Tooltip label={t("askAi")} position="left" events={{ hover: true, focus: true, touch: false }}>
      <UnstyledButton
        aria-label={t("askAi")}
        className={classes.button}
        onClick={() => {
          trackAgentOpened("drawer", pathname);
          setOpen(true);
        }}
      >
        <SparklesIcon />
      </UnstyledButton>
    </Tooltip>
  );
}

const SPARKLES_PATH =
  "M10.2344 2.6625C10.0938 2.71562 10 2.85 10 3C10 3.15 10.0938 3.28438 10.2344 3.3375L12 4L12.6625 5.76562C12.7156 5.90625 12.85 6 13 6C13.15 6 13.2844 5.90625 13.3375 5.76562L14 4L15.7656 3.3375C15.9062 3.28438 16 3.15 16 3C16 2.85 15.9062 2.71562 15.7656 2.6625L14 2L13.3375 0.234375C13.2844 0.09375 13.15 0 13 0C12.85 0 12.7156 0.09375 12.6625 0.234375L12 2L10.2344 2.6625ZM6.40938 2.29063C6.32812 2.1125 6.15 2 5.95625 2C5.7625 2 5.58438 2.1125 5.50313 2.29063L3.85313 5.85313L0.290625 7.5C0.1125 7.58125 0 7.75938 0 7.95625C0 8.15312 0.1125 8.32812 0.290625 8.40938L3.85625 10.0562L5.5 13.6187C5.58125 13.7969 5.75938 13.9094 5.95312 13.9094C6.14687 13.9094 6.325 13.7969 6.40625 13.6187L8.05313 10.0531L11.6187 8.40625C11.7969 8.325 11.9094 8.14688 11.9094 7.95312C11.9094 7.75938 11.7969 7.58125 11.6187 7.5L8.05625 5.85625L6.40938 2.29063ZM12 12L10.2344 12.6625C10.0938 12.7156 10 12.85 10 13C10 13.15 10.0938 13.2844 10.2344 13.3375L12 14L12.6625 15.7656C12.7156 15.9062 12.85 16 13 16C13.15 16 13.2844 15.9062 13.3375 15.7656L14 14L15.7656 13.3375C15.9062 13.2844 16 13.15 16 13C16 12.85 15.9062 12.7156 15.7656 12.6625L14 12L13.3375 10.2344C13.2844 10.0938 13.15 10 13 10C12.85 10 12.7156 10.0938 12.6625 10.2344L12 12Z";

function SparklesIcon() {
  const id = useId().replace(/[^\w-]/g, "");
  const maskId = `${id}-mask`;
  const gradientId = `${id}-gradient`;

  return (
    <svg className={classes.icon} width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <defs>
        <mask id={maskId} fill="white">
          <path d={SPARKLES_PATH} />
        </mask>
        <linearGradient id={gradientId} x1={-59} y1={8} x2={32} y2={8} gradientUnits="userSpaceOnUse">
          <stop style={{ stopColor: "var(--map-ai-start)" }} />
          <stop offset={1} style={{ stopColor: "var(--map-ai-end)" }} />
        </linearGradient>
      </defs>
      <path className={classes.iconStroke} d={SPARKLES_PATH} stroke={`url(#${gradientId})`} strokeWidth={2.4} mask={`url(#${maskId})`} />
    </svg>
  );
}
