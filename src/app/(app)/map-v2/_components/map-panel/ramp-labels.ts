/** Smallest space between two labels, in pixels. */
const LABEL_GAP_PX = 18;

/**
 * Where each label under a proportional bar starts, in pixels from the bar's left edge. Each label
 * sits under its segment (the first at its segment's start, the last at its segment's end, the others
 * centred), then labels are pushed apart so they keep their order, never overlap and stay within the bar.
 */
export function placeRampLabels(counts: number[], widths: number[], barWidth: number): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total === 0 || counts.length === 0) return [];
  const last = counts.length - 1;

  let start = 0;
  const lefts = counts.map((count, i) => {
    const segmentStart = (start / total) * barWidth;
    start += count;
    const segmentEnd = (start / total) * barWidth;
    const width = widths[i] ?? 0;
    if (i === 0) return segmentStart;
    if (i === last) return segmentEnd - width;
    return (segmentStart + segmentEnd) / 2 - width / 2;
  });

  for (let i = 1; i < lefts.length; i++) {
    lefts[i] = Math.max(lefts[i]!, lefts[i - 1]! + (widths[i - 1] ?? 0) + LABEL_GAP_PX);
  }
  lefts[last] = Math.min(lefts[last]!, barWidth - (widths[last] ?? 0));
  for (let i = last - 1; i >= 0; i--) {
    lefts[i] = Math.min(lefts[i]!, lefts[i + 1]! - LABEL_GAP_PX - (widths[i] ?? 0));
  }
  lefts[0] = Math.max(lefts[0]!, 0);
  return lefts;
}
