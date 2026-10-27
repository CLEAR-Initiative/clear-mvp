/**
 * Title, discussion, and evidence kept on this browser for an analysis.
 *
 * clear-api does not store these yet. The copy is private to the signed-in
 * user and their active team, and sign-out removes it. When a later API
 * returns a title, comments, or files, that copy replaces this one.
 */

const TITLE = "clear.analysis.title.";
const COMMENTS = "clear.analysis.comments.";
const FILES = "clear.analysis.files.";
const PREFIXES = [TITLE, COMMENTS, FILES];

/** Whose browser copy this is. A shared computer must not show another account's notes. */
export interface AnalysisOwner {
  userId: string;
  teamId: string | null;
}

/** Storage suffix for one analysis. The scope key stays `country:<id>` or `created:<id>`. */
export function analysisStorageKey(scopeKey: string, owner: AnalysisOwner): string {
  return `${owner.userId}:${owner.teamId ?? ""}:${scopeKey}`;
}

/** Drop every analysis copy on this browser. Called on sign-out. */
export function clearAnalysisCollaboration(): void {
  if (typeof window === "undefined") return;
  const drop: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && PREFIXES.some((prefix) => key.startsWith(prefix))) drop.push(key);
  }
  for (const key of drop) localStorage.removeItem(key);
}

/** Rows whose ids the server has confirmed, taken off the latest list. */
export function dropConfirmed<T extends { id: string }>(current: readonly T[], confirmedIds: ReadonlySet<string>): T[] {
  return current.filter((item) => !confirmedIds.has(item.id));
}

export interface StoredComment {
  id: string;
  text: string;
  createdAt: string;
  author: string | null;
  /** Not yet confirmed by the server. Kept beside a successful server list. */
  pending: boolean;
}

export interface StoredFile {
  id: string;
  name: string;
  addedAt: string;
  /** Session-only preview. Not written to storage. */
  url?: string;
  pending: boolean;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode: the in-memory copy still shows until the view unmounts.
  }
}

export function readAnalysisTitle(scopeKey: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(TITLE + scopeKey)?.trim();
    return value ? value : null;
  } catch {
    return null;
  }
}

export function writeAnalysisTitle(scopeKey: string, title: string): void {
  const value = title.trim();
  if (!value || typeof window === "undefined") return;
  try {
    localStorage.setItem(TITLE + scopeKey, value);
  } catch {
    // The header state still shows the rename for this view.
  }
}

export function readAnalysisComments(scopeKey: string): StoredComment[] {
  const rows = read<StoredComment[]>(COMMENTS + scopeKey, []);
  return Array.isArray(rows) ? rows.filter((row) => row && typeof row.text === "string" && typeof row.id === "string") : [];
}

export function writeAnalysisComments(scopeKey: string, comments: StoredComment[]): void {
  write(COMMENTS + scopeKey, comments);
}

export function readAnalysisFiles(scopeKey: string): StoredFile[] {
  const rows = read<StoredFile[]>(FILES + scopeKey, []);
  return Array.isArray(rows) ? rows.filter((row) => row && typeof row.name === "string" && typeof row.id === "string") : [];
}

export function writeAnalysisFiles(scopeKey: string, files: StoredFile[]): void {
  write(
    FILES + scopeKey,
    files.map(({ url: _url, ...row }) => row),
  );
}

/** Server rows first. Local rows still waiting on the server stay after them. */
export function mergePending<T extends { id: string; pending?: boolean }>(server: T[], local: T[]): T[] {
  const ids = new Set(server.map((row) => row.id));
  return [...server, ...local.filter((row) => row.pending && !ids.has(row.id))];
}
