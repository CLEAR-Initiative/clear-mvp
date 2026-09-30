"use client";

import { Box, Text } from "@mantine/core";
import type { SaBullet, SaSource } from "~/server/api/mappers/situation-analysis";
import { BulletRow } from "../situation/bullet-row";
import { Citations } from "../situation/citations";
import { splitSubject } from "~/lib/analysis-view";

/** Key findings under the summary. Hidden for analyses generated before they existed. */
export function KeyFindings({
  items,
  sources,
  onOpenSources,
}: {
  items: SaBullet[];
  sources: SaSource[];
  onOpenSources?: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <Box
      mt={12}
      px={16}
      py={8}
      style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-white)" }}
      data-testid="analysis-key-findings"
    >
      {items.map((f, i) => {
        const { subject, body } = splitSubject(f.text);
        return (
          <BulletRow key={i} last={i === items.length - 1}>
            {subject && (
              <Text span fw={700}>
                {subject}:{" "}
              </Text>
            )}
            {body}
            {f.refs.length > 0 && (
              <>
                {" "}
                <Citations refs={f.refs} sources={sources} onOpen={onOpenSources} variant="inline" />
              </>
            )}
          </BulletRow>
        );
      })}
    </Box>
  );
}
