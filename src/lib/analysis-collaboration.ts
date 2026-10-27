/**
 * Title, discussion, and evidence kept on this browser for an analysis.
 *
 * The server copy (automation title, comments, uploaded documents) wins when
 * it can be read. Until then, and whenever that read fails, this copy is what
 * the page shows, so a rename or a comment is still there after a refresh.
 */

const TITLE = "clear.analysis.title.";
const COMMENTS = "clear.analysis.comments.";
const FILES = "clear.analysis.files.";

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
