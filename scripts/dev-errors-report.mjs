#!/usr/bin/env node
/**
 * Lists the unresolved errors the dev environment has reported to GlitchTip
 * since the last prod sync, so nobody promotes `dev` to `prod` without
 * reading them.
 *
 * Why: the three bug classes that reached prod with the 13 Nov 2026 sync
 * (Mapbox "expression.evaluate", the removed-map canvas crash, React #418)
 * were all in dev GlitchTip from 10 Nov. Nobody looked. See
 * .github/workflows/check-dev-errors.yml.
 *
 * Usage: node scripts/dev-errors-report.mjs
 * Environment:
 *   GLITCHTIP_TOKEN       read token for the dev GlitchTip (required)
 *   GLITCHTIP_URL         default https://dev-sentry.clearinitiative.io
 *   GLITCHTIP_ORG         default clear
 *   GLITCHTIP_PROJECT_ID  default 1 (clear-mvp on dev)
 *   SINCE                 ISO time; only errors seen at or after it (required)
 *   UNTIL                 ISO time; only errors first seen at or before it
 *                         (optional, to replay a past date)
 *   MODE                  "sync" fails when errors are listed; "report"
 *                         (default) only prints them
 *   REVIEWED              "true" when a person has read the list (the
 *                         `dev-errors-reviewed` label): sync mode passes
 *
 * Prints the report as markdown. Exit code 1 means "errors to review".
 */
import { fileURLToPath } from "node:url";

/** Marks the PR comment so the workflow updates it in place. */
export const COMMENT_MARKER = "<!-- dev-errors-report -->";

/**
 * One key per error class. GlitchTip splits one bug into many issues when the
 * message carries a variable part (React #418 was 15 issues in prod).
 */
export function classKey(title) {
  // A minified React error is identified by its code: #418 and #423 are
  // different bugs, and the rest of the title is a URL with arguments.
  const react = title.match(/Minified React error #(\d+)/);
  if (react) return `Minified React error #${react[1]}`;
  return title
    .replace(/\s*\(In '.*$/s, "") // Safari appends the failing expression
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
    .replace(/\d+/g, "N")
    .replace(/[.…\s]+$/, "")
    .trim();
}

/** Unresolved issues seen at or after `since` (and first seen by `until`). */
export function selectIssues(issues, { since, until }) {
  const from = Date.parse(since);
  const to = until ? Date.parse(until) : Infinity;
  return issues.filter(
    (i) => i.status === "unresolved" && Date.parse(i.lastSeen) >= from && Date.parse(i.firstSeen) <= to,
  );
}

/** Groups issues into classes, most events first. */
export function groupClasses(issues) {
  const classes = new Map();
  for (const issue of issues) {
    const key = classKey(issue.title);
    const entry = classes.get(key) ?? { key, title: issue.title, events: 0, issues: [], firstSeen: issue.firstSeen, lastSeen: issue.lastSeen };
    entry.events += Number(issue.count);
    entry.issues.push(issue);
    if (issue.firstSeen < entry.firstSeen) entry.firstSeen = issue.firstSeen;
    if (issue.lastSeen > entry.lastSeen) entry.lastSeen = issue.lastSeen;
    classes.set(key, entry);
  }
  return [...classes.values()].sort((a, b) => b.events - a.events || a.key.localeCompare(b.key));
}

/** The `rel="next"` URL of a Sentry-style Link header, when it has results. */
export function nextPageUrl(linkHeader) {
  for (const part of (linkHeader ?? "").split(",")) {
    if (/rel="next"/.test(part) && /results="true"/.test(part)) return part.match(/<([^>]+)>/)?.[1] ?? null;
  }
  return null;
}

const day = (iso) => iso.slice(0, 10);
const cell = (text) => text.replace(/\|/g, "\\|").replace(/\s+/g, " ");

/** The markdown report. `outcome` is "clean" | "reviewed" | "blocked" | "report". */
export function renderReport(classes, { since, baseUrl, org, outcome }) {
  const lines = [COMMENT_MARKER, "## Dev errors since the last prod sync", ""];
  if (classes.length === 0) {
    lines.push(`No unresolved errors on dev since ${day(since)}.`);
    return lines.join("\n") + "\n";
  }
  const n = classes.length;
  lines.push(`Dev reported ${n} unresolved error ${n === 1 ? "class" : "classes"} since ${day(since)}.`, "");
  lines.push("| Events | First seen | Last seen | Error | Issues |", "|---:|---|---|---|---|");
  for (const c of classes) {
    const links = c.issues
      .slice(0, 5)
      .map((i) => `[#${i.id}](${baseUrl}/${org}/issues/${i.id})`)
      .join(" ");
    const more = c.issues.length > 5 ? ` +${c.issues.length - 5}` : "";
    lines.push(`| ${c.events} | ${day(c.firstSeen)} | ${day(c.lastSeen)} | ${cell(c.title).slice(0, 120)} | ${links}${more} |`);
  }
  lines.push("");
  if (outcome === "blocked") {
    lines.push(
      "**This check fails until each error is handled.** For each one:",
      "",
      "1. Fix it on `dev`, or decide that it can ship.",
      "2. Resolve the issue in dev GlitchTip.",
      "",
      "To ship with errors still open, add the `dev-errors-reviewed` label. The label means a person read this list.",
    );
  } else if (outcome === "reviewed") {
    lines.push("The `dev-errors-reviewed` label is on this PR, so the check passes.");
  } else {
    lines.push("This PR is not a `dev` sync, so the check passes. The list is for information.");
  }
  return lines.join("\n") + "\n";
}

/** "clean" | "reviewed" | "blocked" | "report". Only "blocked" fails. */
export function decideOutcome(classCount, { mode, reviewed }) {
  if (classCount === 0) return "clean";
  if (mode !== "sync") return "report";
  return reviewed ? "reviewed" : "blocked";
}

async function fetchIssues({ baseUrl, org, projectId, token }) {
  let url = `${baseUrl}/api/0/organizations/${org}/issues/?project=${projectId}&query=is:unresolved&sort=-last_seen&limit=100`;
  const issues = [];
  for (let page = 0; url && page < 50; page++) {
    // GlitchTip answers some default client User-Agents with a 500.
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, "User-Agent": "clear-mvp-dev-errors-report" } });
    if (!res.ok) throw new Error(`GlitchTip answered ${res.status} for the issues list`);
    issues.push(...(await res.json()));
    url = nextPageUrl(res.headers.get("link"));
  }
  return issues;
}

async function main() {
  const env = process.env;
  const baseUrl = (env.GLITCHTIP_URL ?? "https://dev-sentry.clearinitiative.io").replace(/\/$/, "");
  const org = env.GLITCHTIP_ORG ?? "clear";
  const projectId = env.GLITCHTIP_PROJECT_ID ?? "1";
  const mode = env.MODE === "sync" ? "sync" : "report";
  if (!env.GLITCHTIP_TOKEN) throw new Error("GLITCHTIP_TOKEN is not set");
  if (!env.SINCE || Number.isNaN(Date.parse(env.SINCE))) throw new Error("SINCE must be an ISO time");

  const issues = await fetchIssues({ baseUrl, org, projectId, token: env.GLITCHTIP_TOKEN });
  const classes = groupClasses(selectIssues(issues, { since: env.SINCE, until: env.UNTIL || undefined }));
  const outcome = decideOutcome(classes.length, { mode, reviewed: env.REVIEWED === "true" });
  process.stdout.write(renderReport(classes, { since: env.SINCE, baseUrl, org, outcome }));
  process.exitCode = outcome === "blocked" ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    // Exit 2, not 1: "could not check" is different from "errors to review".
    console.error(`dev-errors-report: ${err.message}`);
    process.exitCode = 2;
  });
}
