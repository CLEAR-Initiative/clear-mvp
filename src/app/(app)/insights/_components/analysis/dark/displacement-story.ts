import { splitSubject } from "~/lib/analysis-view";
import type {
  SaBullet,
  SaDisplacement,
  SaDisplacementGroup,
  SaDisplacementTone,
} from "~/server/api/mappers/situation-analysis";
import { leadingFigure } from "./leading-figure";

/** The design shows six findings. Older analyses can have dozens of bullets. */
export const STORY_LIMIT = 6;

export interface StoryRow {
  num: number;
  label: string;
  callout: string | null;
  text: string;
  refs: number[];
  tone: SaDisplacementTone;
  /** Null for findings about both groups, and for older bullets, which have no group. */
  group: SaDisplacementGroup | null;
  asOf: string | null;
  isNew: boolean;
  /** The movement map carries a badge with this row's number. */
  onMap: boolean;
}

export interface DisplacementStory {
  rows: StoryRow[];
  /** Rows past the limit, shown only after "Show all". Always empty for edited findings. */
  more: StoryRow[];
  summary: string | null;
  dataCheck: SaDisplacement["dataCheck"];
}

/**
 * The Displacement section's findings. Edited findings from the pipeline are
 * used as they are. Older analyses only have push and return bullets: those
 * become rows with a label (the bullet's own subject, else the group name), a
 * leading figure as the callout, and the push or return tone. Pushes and
 * returns share the first six places so neither side is hidden.
 */
export function displacementStory(
  d: SaDisplacement,
  groupLabels: { push: string; return: string },
): DisplacementStory {
  if (d.findings.length > 0) {
    const onMap = new Set(d.flows.map((f) => f.finding).filter((n): n is number => n != null));
    return {
      rows: d.findings.map((f, i) => ({ ...f, num: i + 1, onMap: onMap.has(i + 1) })),
      more: [],
      summary: d.summary,
      dataCheck: d.dataCheck,
    };
  }

  const push = d.push.map((b) => ({ bullet: b, tone: "out" as const, group: groupLabels.push }));
  const back = d.return.map((b) => ({ bullet: b, tone: "back" as const, group: groupLabels.return }));
  const half = STORY_LIMIT / 2;
  const pushFirst = Math.max(half, STORY_LIMIT - back.length);
  const backFirst = STORY_LIMIT - Math.min(push.length, pushFirst);
  const ordered = [
    ...push.slice(0, pushFirst),
    ...back.slice(0, backFirst),
    ...push.slice(pushFirst),
    ...back.slice(backFirst),
  ];
  const rows = ordered.map(({ bullet, tone, group }, i): StoryRow => {
    const { subject, body } = splitSubject(bullet.text);
    const lead = leadingFigure(body);
    return {
      num: i + 1,
      label: subject ?? group,
      callout: lead?.figure ?? null,
      text: lead?.rest ?? body,
      refs: bullet.refs,
      tone,
      group: null,
      asOf: null,
      isNew: false,
      onMap: false,
    };
  });
  return {
    rows: rows.slice(0, STORY_LIMIT),
    more: rows.slice(STORY_LIMIT),
    summary: d.summary,
    dataCheck: d.dataCheck,
  };
}

/** The Displacement section as report bullets: the edited findings when there are any, else the older push list. */
export function displacementBullets(d: SaDisplacement): SaBullet[] {
  if (d.findings.length === 0) return d.push;
  return d.findings.map((f) => ({ text: `${f.label}: ${f.callout ? `${f.callout} ` : ""}${f.text}`, refs: f.refs }));
}
