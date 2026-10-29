"use client";

import { useEffect, useRef, type RefObject } from "react";
import { track } from "./track";
import type { EventOpenedFrom } from "./event-source";
import type { AnalyticsEventProps } from "./events";

/**
 * Remembers which keys already fired in this view, so an effect re-run
 * (React strict mode's double invoke, a re-render, a refetch) never fires
 * twice. `reset()` starts a new view. Pure, so it is unit-tested directly.
 */
export function createOncePerView() {
  const seen = new Set<string>();
  return {
    /** True the first time `key` is seen in this view, false after. */
    claim(key: string): boolean {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    },
    reset(): void {
      seen.clear();
    },
  };
}

/**
 * Fire `event.opened {from}` once per open of `eventId`. A different id
 * (prev/next, a related Event) is a new open; `null` (drawer closed) ends the view, so
 * reopening the same Event counts again.
 */
export function useTrackEventOpened(eventId: string | null | undefined, from: EventOpenedFrom): void {
  // Only the current open is remembered: A → B → A is three opens, while an
  // effect re-run for the same open (strict mode, re-render) is not.
  const current = useRef<string | null>(null);
  const fromRef = useRef(from);
  fromRef.current = from;
  useEffect(() => {
    if (!eventId) {
      current.current = null;
      return;
    }
    if (current.current === eventId) return;
    current.current = eventId;
    track("event.opened", { from: fromRef.current });
  }, [eventId]);
}

type Section = AnalyticsEventProps<"event.section_seen">["section"];

/**
 * Fire `event.section_seen {section}` the first time `ref`'s element scrolls
 * into view, at most once per `viewKey` (the Event id).
 */
export function useTrackSectionSeen(
  ref: RefObject<Element | null>,
  section: Section,
  viewKey: string | null | undefined,
): void {
  const once = useRef(createOncePerView());
  const lastView = useRef(viewKey);
  if (lastView.current !== viewKey) {
    lastView.current = viewKey;
    once.current.reset();
  }
  useEffect(() => {
    const el = ref.current;
    if (!el || !viewKey || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      // An empty wrapper (section hidden) has no height: not "seen".
      if (!entries.some((e) => e.isIntersecting && e.boundingClientRect.height > 0)) return;
      observer.disconnect();
      if (once.current.claim(section)) track("event.section_seen", { section });
    });
    observer.observe(el);
    return () => observer.disconnect();
  });
}
