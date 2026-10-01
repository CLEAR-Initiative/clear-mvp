"use client";

/**
 * One owner for an Agent deep link on the Map or Detection: whether the page
 * can show its place, applying it once, and the URL rewrite that follows.
 *
 * - A link the page can't show (an unknown place, or outside the active
 *   team's scope) is dropped whole, with a word to the user, instead of the
 *   page quietly showing another country under the Agent's "Moved you to …".
 * - A link the page can show is applied once per arrival. A fresh Agent move
 *   (marked by AgentProvider) applies like picking it by hand; arriving on
 *   the same URL again (Back, a reload, a detail page and back) is a revisit,
 *   and the page restores the state it had instead.
 * - The one-shot parameters then leave the URL in a single replace; the
 *   country stays as the visit's override until the user picks a country.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { notifications } from "@mantine/notifications";
import { withoutDeepLink, type LinkScope } from "~/lib/agent-deep-link";
import { AGENT_DEEP_LINK_EVENT, sameHref, takeAgentDeepLink } from "~/lib/agent-navigation";

export interface AgentDeepLinkOptions {
  /** The page's path, e.g. `/map`. */
  path: string;
  /** Every deep-link parameter the page reads. */
  params: readonly string[];
  /** Parameters applied once and then taken out of the URL. */
  oneShot: readonly string[];
  /** What the page makes of the link's place. */
  scope: LinkScope;
  /** Apply the link: `fresh` for an Agent move, otherwise restore the visit's state. */
  apply: (fresh: boolean) => void;
  /** The link's country left the URL while the page stayed open. */
  onGone: () => void;
}

const currentHref = () => `${window.location.pathname}${window.location.search}`;

/** The deep-link part of a query: what identifies one link. */
function linkKeyOf(query: Pick<URLSearchParams, "get">, params: readonly string[]): string {
  return params
    .map((key) => [key, query.get(key)] as const)
    .filter(([, value]) => value !== null)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

export function useAgentDeepLink({ path, params, oneShot, scope, apply, onGone }: AgentDeepLinkOptions): void {
  const t = useTranslations("agent.navigation");
  const router = useRouter();
  const searchParams = useSearchParams();
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const onGoneRef = useRef(onGone);
  onGoneRef.current = onGone;

  const linkKey = linkKeyOf(searchParams, params);
  const hasOneShot = oneShot.some((key) => searchParams.has(key));

  /** The link already handled on this mount (after its one-shot rewrite). */
  const handledRef = useRef<string | null>(null);
  const hadCountryRef = useRef(false);

  // The Agent moving to the URL already on screen changes nothing in the URL;
  // its event is what says "apply this again".
  const [again, setAgain] = useState(0);
  useEffect(() => {
    const onMove = (e: Event) => {
      const url = (e as CustomEvent<{ url?: string }>).detail?.url;
      if (url && sameHref(url, currentHref())) {
        handledRef.current = null;
        setAgain((n) => n + 1);
      }
    };
    window.addEventListener(AGENT_DEEP_LINK_EVENT, onMove);
    return () => window.removeEventListener(AGENT_DEEP_LINK_EVENT, onMove);
  }, []);

  const status = scope.status;
  const refusedCountry = scope.status === "refused" ? scope.country : undefined;
  useEffect(() => {
    if (status === "pending") return;
    const replace = (keys: readonly string[]) => {
      const next = `${path}${withoutDeepLink(new URLSearchParams(searchParams.toString()), keys)}`;
      router.replace(next, { scroll: false });
      return next;
    };

    if (status === "none") {
      if (hadCountryRef.current) onGoneRef.current();
      hadCountryRef.current = false;
      handledRef.current = null;
      // One-shot filters mean nothing without their place.
      if (hasOneShot) replace(oneShot);
      return;
    }

    if (handledRef.current === linkKey) return;
    if (status === "refused") {
      handledRef.current = linkKey;
      notifications.show({
        color: "yellow",
        message: refusedCountry ? t("outOfScope", { country: refusedCountry }) : t("placeUnavailable"),
      });
      // Nothing of a refused link was applied, so nothing needs undoing.
      replace(params);
      return;
    }

    hadCountryRef.current = true;
    const fresh = hasOneShot || takeAgentDeepLink(currentHref());
    applyRef.current(fresh);
    // After the rewrite the URL holds only the country: that is this link too.
    handledRef.current = hasOneShot
      ? linkKeyOf(new URL(replace(oneShot), "http://app.local").searchParams, params)
      : linkKey;
    // `again` re-runs this for a repeat move to the same URL.
  }, [status, refusedCountry, linkKey, hasOneShot, again, path, params, oneShot, searchParams, router, t]);
}
