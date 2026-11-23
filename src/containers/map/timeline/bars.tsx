"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { useTranslations } from "next-intl";
import { IconSelector } from "@tabler/icons-react";
import { TIMELINE_DAYS, barHeights, moveHandle, nearestHandle, stepHandle, type BarRange } from "../timeframe/model";
import classes from "./timeline.module.css";

type Handle = "start" | "end";

type BarsProps = {
  counts: number[];
  range: BarRange;
  draft: BarRange | null;
  longDay: (index: number) => string;
  onDraft: (range: BarRange) => void;
  onDragEnd: (apply: boolean) => void;
  onKeyStep: (range: BarRange) => void;
};

const pct = (index: number) => `${(index / TIMELINE_DAYS) * 100}%`;

export function Bars({ counts, range, draft, longDay, onDraft, onDragEnd, onKeyStep }: BarsProps) {
  const t = useTranslations("mapV2.timeline");
  const barsRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ range: BarRange; handle: Handle; fromHandle: boolean } | null>(null);
  const shown = draft ?? range;
  const heights = barHeights(counts, 0.03);

  const positionAt = (clientX: number) => {
    const el = barsRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const rtl = getComputedStyle(el).direction === "rtl";
    const x = rtl ? rect.right - clientX : clientX - rect.left;
    return (x / rect.width) * TIMELINE_DAYS;
  };

  const indexAt = (clientX: number, drag: { handle: Handle; fromHandle: boolean } | null) => {
    const position = positionAt(clientX);
    if (position == null) return null;
    if (!drag?.fromHandle) return Math.floor(position);
    const edge = Math.round(position);
    return drag.handle === "start" ? edge : edge - 1;
  };

  const finish = (apply: boolean) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    onDragEnd(apply);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // A right or ctrl click opens the context menu, which swallows the release.
    if (event.button !== 0) return;
    const pressedHandle = (event.target as Element).closest<HTMLElement>("[data-handle]");
    if (pressedHandle) {
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = { range: shown, handle: pressedHandle.dataset.handle as Handle, fromHandle: true };
      return;
    }
    const index = indexAt(event.clientX, null);
    if (index == null) return;
    const handle = nearestHandle(shown, index);
    event.currentTarget.setPointerCapture(event.pointerId);
    const next = moveHandle(shown, handle, index);
    dragRef.current = { range: next, handle, fromHandle: false };
    onDraft(next);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const index = indexAt(event.clientX, drag);
    if (index == null) return;
    const next = moveHandle(drag.range, drag.handle, index);
    if (next[0] === drag.range[0] && next[1] === drag.range[1]) return;
    dragRef.current = { ...drag, range: next };
    onDraft(next);
  };

  const onKeyDown = (handle: Handle) => (event: KeyboardEvent<HTMLSpanElement>) => {
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const next = stepHandle(shown, handle, event.key, rtl);
    if (!next) return;
    event.preventDefault();
    onKeyStep(next);
  };

  const handleProps = (handle: Handle) => {
    const index = handle === "start" ? shown[0] : shown[1];
    return {
      role: "slider",
      tabIndex: 0,
      "data-handle": handle,
      "aria-label": t(handle === "start" ? "startHandle" : "endHandle"),
      "aria-valuemin": 0,
      "aria-valuemax": TIMELINE_DAYS - 1,
      "aria-valuenow": index,
      "aria-valuetext": longDay(index),
      className: classes.handle,
      style: { insetInlineStart: pct(handle === "start" ? index : index + 1) },
      onKeyDown: onKeyDown(handle),
    } as const;
  };

  return (
    <div
      ref={barsRef}
      className={classes.bars}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        finish(true);
      }}
      // A release outside the window or a system gesture never reaches the bars; losing the capture still ends the drag.
      onLostPointerCapture={() => finish(true)}
      onPointerCancel={() => finish(false)}
    >
      {heights.map((height, index) => (
        <span
          key={index}
          className={classes.bar}
          data-in={(index >= shown[0] && index <= shown[1]) || undefined}
          style={{ height: `${height * 100}%` }}
        />
      ))}
      <span {...handleProps("start")}>
        <IconSelector size={10} className={classes.knob} aria-hidden />
      </span>
      <span {...handleProps("end")}>
        <IconSelector size={10} className={classes.knob} aria-hidden />
      </span>
    </div>
  );
}
