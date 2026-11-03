"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { IconChevronDown, type Icon } from "@tabler/icons-react";
import type { SaBullet, SaSource } from "~/server/api/mappers/situation-analysis";
import { splitSubject } from "~/lib/analysis-view";
import { Citations } from "../../situation/citations";
import type { TopicGroup } from "./taxonomy-topics";
import styles from "./analysis-dark.module.css";

const ROWS = 4;

/** Warning for what makes a shock worse, positive for what reduces it, info for access. */
export type TopicTone = "warning" | "positive" | "info";

type TopicItem = SaBullet & { scope?: string | null };

/** One card per taxonomy topic, its findings listed as rows. Matches the design's vulnerability cards. */
export function TopicCards({
  groups,
  labelFor,
  iconFor,
  tone,
  sources,
  onOpen,
}: {
  groups: TopicGroup<TopicItem>[];
  labelFor: (topic: string) => string;
  iconFor: (topic: string) => Icon;
  tone: TopicTone;
  sources: SaSource[];
  onOpen: () => void;
}) {
  return (
    <div className={styles.topicGrid}>
      {groups.map((group) => (
        <TopicCard
          key={group.topic}
          group={group}
          label={labelFor(group.topic)}
          icon={iconFor(group.topic)}
          tone={tone}
          sources={sources}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

function TopicCard({
  group,
  label,
  icon: TopicIcon,
  tone,
  sources,
  onOpen,
}: {
  group: TopicGroup<TopicItem>;
  label: string;
  icon: Icon;
  tone: TopicTone;
  sources: SaSource[];
  onOpen: () => void;
}) {
  const t = useTranslations("analysis.findings");
  const [all, setAll] = useState(false);
  const rows = all ? group.items : group.items.slice(0, ROWS);
  return (
    <section className={styles.topicCard} data-topic={group.topic}>
      <div className={styles.topicHead}>
        <span className={styles.topicIcon} data-tone={tone}>
          <TopicIcon size={15} stroke={1.8} />
        </span>
        <span className={styles.topicName}>{label}</span>
        <span className={styles.topicCount}>{group.items.length}</span>
      </div>
      {rows.map((item, i) => {
        const { subject, body } = splitSubject(item.text);
        const cite = item.refs.length > 0 && <Citations refs={item.refs} sources={sources} onOpen={onOpen} variant="inline" />;
        return (
          <div key={i} className={styles.topicRow}>
            <div className={styles.topicRowTitle}>
              {subject ?? item.text}
              {item.scope && <span className={styles.scopeChip}>{item.scope}</span>}
              {!subject && cite && <> {cite}</>}
            </div>
            {subject && (
              <div className={styles.topicRowText}>
                {body}
                {cite && <> {cite}</>}
              </div>
            )}
          </div>
        );
      })}
      {group.items.length > ROWS && (
        <button type="button" className={styles.topicMore} aria-expanded={all} onClick={() => setAll((value) => !value)}>
          {all ? t("showLess") : t("showAll", { count: group.items.length })}
          <IconChevronDown size={14} className={styles.twist} style={{ transform: all ? "rotate(180deg)" : undefined }} />
        </button>
      )}
    </section>
  );
}
