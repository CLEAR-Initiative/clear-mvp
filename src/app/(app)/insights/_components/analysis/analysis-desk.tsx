"use client";

import { useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { IconDownload, IconMessageCircle, IconUpload, IconX } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { GqlUserComment } from "~/lib/types/graphql";
import {
  dropConfirmed,
  mergePending,
  readAnalysisComments,
  readAnalysisFiles,
  writeAnalysisComments,
  writeAnalysisFiles,
  type StoredComment,
  type StoredFile,
} from "~/lib/analysis-collaboration";
import { readAnalysisFile, saveAnalysisFile } from "~/lib/analysis-file-store";
import styles from "./dark/analysis-dark.module.css";
import { track } from "~/lib/analytics/track";

interface ShownComment {
  id: string;
  text: string;
  createdAt: string;
  author: string | null;
}

interface ShownFile {
  id: string;
  name: string;
  addedAt: string;
  url?: string;
  reportId?: string;
  /** This browser has no bytes and the knowledge base has no link yet. */
  missing?: boolean;
}

function fromServerComment(row: GqlUserComment): ShownComment {
  return { id: row.id, text: row.comment, createdAt: row.createdAt, author: row.user.name };
}

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

/**
 * Add evidence and the discussion, side by side. Comments and files are kept
 * on this browser immediately. When the analysis has an automation, they are
 * also stored for the team and that copy replaces the local one.
 */
export function AnalysisDesk({
  storageKey,
  automationId,
  teamId,
}: {
  storageKey: string;
  automationId: string | null;
  teamId: string | null;
}) {
  const t = useTranslations("analysis.layout");
  const format = useFormatter();
  const me = api.auth.me.useQuery();
  const thread = api.analysis.thread.useQuery(
    { id: automationId ?? "" },
    { enabled: !!automationId, retry: false, refetchOnWindowFocus: false },
  );
  const addComment = api.analysis.comment.useMutation();
  const fileRef = useRef<HTMLInputElement>(null);
  const ownedUrl = useRef<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [draft, setDraft] = useState("");
  const [preview, setPreview] = useState<ShownFile | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const [localComments, setLocalComments] = useState<StoredComment[]>([]);
  const [localFiles, setLocalFiles] = useState<StoredFile[]>([]);
  const commentsRef = useRef<StoredComment[]>([]);
  const filesRef = useRef<StoredFile[]>([]);
  const sessionUrls = useRef(new Map<string, string>());

  useEffect(() => {
    const comments = readAnalysisComments(storageKey);
    const files = readAnalysisFiles(storageKey);
    commentsRef.current = comments;
    filesRef.current = files;
    setLocalComments(comments);
    setLocalFiles(files);
    setDraft("");
    setPreview(null);
    setPdfError(false);
  }, [storageKey]);

  useEffect(() => {
    return () => {
      if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current);
    };
  }, []);

  const serverReady = !!automationId && thread.isSuccess && thread.data != null;
  const comments: ShownComment[] = serverReady
    ? mergePending(
        thread.data.comments.map((row) => ({ ...fromServerComment(row), pending: false as boolean })),
        localComments,
      )
    : localComments;
  const files: ShownFile[] = (
    serverReady
      ? mergePending(
          thread.data.documents.map((row) => ({
            id: row.id,
            name: row.fileName,
            addedAt: row.createdAt,
            url: row.url ?? undefined,
            reportId: row.reportId ?? undefined,
            pending: false,
          })),
          localFiles,
        )
      : localFiles
  ).map((row) => ({ ...row, url: sessionUrls.current.get(row.id) ?? row.url }));

  const rememberComments = (update: (current: StoredComment[]) => StoredComment[]) => {
    const next = update(commentsRef.current);
    commentsRef.current = next;
    setLocalComments(next);
    writeAnalysisComments(storageKey, next);
  };
  const rememberFiles = (update: (current: StoredFile[]) => StoredFile[]) => {
    const next = update(filesRef.current);
    filesRef.current = next;
    setLocalFiles(next);
    writeAnalysisFiles(storageKey, next);
  };

  const post = async () => {
    const text = draft.trim();
    if (!text || addComment.isPending) return;
    const row: StoredComment = {
      id: `local-${Date.now()}`,
      text,
      createdAt: new Date().toISOString(),
      author: me.data?.user?.name ?? null,
      pending: true,
    };
    rememberComments((current) => [...current, row]);
    setDraft("");
    if (!automationId) return;
    try {
      await addComment.mutateAsync({ id: automationId, comment: text });
      const fresh = await thread.refetch();
      if (fresh.data) {
        const saved = new Set(fresh.data.comments.map((item) => item.comment));
        if (saved.has(text)) rememberComments((current) => dropConfirmed(current, new Set([row.id])));
      }
    } catch {
      // The comment stays in the local thread.
    }
  };

  const closePreview = () => {
    if (ownedUrl.current) {
      URL.revokeObjectURL(ownedUrl.current);
      ownedUrl.current = null;
    }
    setPreview(null);
  };

  const openFile = async (file: ShownFile) => {
    track("analysis.evidence_previewed");
    if (ownedUrl.current) {
      URL.revokeObjectURL(ownedUrl.current);
      ownedUrl.current = null;
    }
    const saved = (file.reportId ? await readAnalysisFile(storageKey, file.reportId) : null) ?? (await readAnalysisFile(storageKey, file.id));
    if (saved) {
      const url = URL.createObjectURL(saved);
      ownedUrl.current = url;
      setPreview({ ...file, url, missing: false });
      return;
    }
    if (file.url) {
      setPreview({ ...file, missing: false });
      return;
    }
    if (file.reportId) {
      try {
        const params = new URLSearchParams({ reportId: file.reportId, name: file.name });
        const res = await fetch(`/api/analysis/evidence?${params}`);
        const body = (await res.json()) as { downloadUrl?: string };
        if (res.ok && body.downloadUrl) {
          setPreview({ ...file, url: body.downloadUrl, missing: false });
          return;
        }
      } catch {
        // The knowledge base has not ingested this PDF yet.
      }
    }
    setPreview({ ...file, url: undefined, missing: true });
  };

  const addFiles = async (list: File[]) => {
    const pdfs = list.filter(isPdf);
    setPdfError(pdfs.length !== list.length);
    if (pdfs.length === 0) return;
    const added: StoredFile[] = [];
    for (const file of pdfs) {
      const id = `local-${file.name}-${file.size}-${Date.now()}`;
      sessionUrls.current.set(id, URL.createObjectURL(file));
      await saveAnalysisFile(storageKey, id, file);
      added.push({ id, name: file.name, addedAt: new Date().toISOString(), pending: true });
    }
    rememberFiles((current) => [...current, ...added]);
    if (!automationId) return;
    for (const [index, file] of pdfs.entries()) {
      const local = added[index];
      if (!local) continue;
      try {
        const body = new FormData();
        body.append("file", file);
        body.append("automationId", automationId);
        if (teamId) body.append("teamId", teamId);
        const res = await fetch("/api/analysis/evidence", { method: "POST", body });
        if (!res.ok) continue;
        const uploaded = (await res.json()) as { reportId?: string | null };
        if (uploaded.reportId) {
          await saveAnalysisFile(storageKey, uploaded.reportId, file);
          rememberFiles((current) =>
            current.map((row) => (row.id === local.id ? { ...row, reportId: uploaded.reportId ?? undefined } : row)),
          );
        }
        const fresh = await thread.refetch();
        const saved = fresh.data?.documents.find((item) => item.fileName === local.name && item.url);
        if (saved) rememberFiles((current) => dropConfirmed(current, new Set([local.id])));
      } catch {
        // The name and the bytes stay in the local list.
      }
    }
  };

  return (
    <div className={styles.desk} data-testid="analysis-desk">
      <section className={styles.deskCard} aria-label={t("addEvidence")} data-testid="analysis-evidence">
        <div className={styles.deskHead}>
          <h2 className={styles.deskTitle}>{t("addEvidence")}</h2>
          <p className={styles.deskMeta}>{t("evidenceFiles", { count: files.length })}</p>
        </div>
        <button
          type="button"
          className={dragging ? `${styles.drop} ${styles.dropActive}` : styles.drop}
          onClick={() => fileRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void addFiles([...event.dataTransfer.files]);
          }}
        >
          <IconUpload size={16} />
          {t("evidenceDrop")}
        </button>
        <input
          ref={fileRef}
          className={styles.deskFileInput}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          data-testid="analysis-evidence-input"
          onChange={(event) => {
            void addFiles([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
        {pdfError && <p className={styles.fileSub}>{t("evidencePdfOnly")}</p>}
        {files.length > 0 && (
          <div className={styles.fileList}>
            {files.map((file) => {
              const body = (
                <>
                  <span className={styles.fileMark}>PDF</span>
                  <span className={styles.fileBody}>
                    <span className={styles.fileNameRow}>
                      <span className={styles.fileName}>{file.name}</span>
                    </span>
                    <span className={styles.fileSub}>{t("evidenceUploadedKind")}</span>
                    <span className={styles.fileStatus}>
                      <span className={styles.pillOk}>{t("evidenceNew")}</span>
                      <span className={styles.fileClass}>{t("evidenceInternal")}</span>
                    </span>
                  </span>
                </>
              );
              return (
                <button key={file.id} type="button" className={styles.fileButton} onClick={() => void openFile(file)}>
                  {body}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.deskCard} aria-label={t("discussionTitle")} data-testid="analysis-discussion">
        <div className={styles.deskHead}>
          <h2 className={styles.deskTitleRow}>
            <IconMessageCircle size={16} />
            <span className={styles.deskTitle}>{t("discussionTitle")}</span>
          </h2>
          <p className={styles.deskMeta}>{t("discussionComments", { count: comments.length })}</p>
        </div>
        {comments.length === 0 ? (
          <div className={styles.deskEmpty}>
            <IconMessageCircle size={28} />
            <p>{t("discussionEmpty")}</p>
          </div>
        ) : (
          <div className={styles.deskThread}>
            {comments.map((comment) => (
              <article key={comment.id} className={styles.deskComment} data-testid="analysis-comment">
                <strong>{comment.author?.trim() || t("discussionYou")}</strong>
                {" · "}
                <span className={styles.deskMeta}>
                  {format.relativeTime(new Date(comment.createdAt))}
                </span>
                <p>{comment.text}</p>
              </article>
            ))}
          </div>
        )}
        <form
          className={styles.composer}
          onSubmit={(event) => {
            event.preventDefault();
            void post();
          }}
        >
          <input
            className={styles.composerInput}
            value={draft}
            placeholder={t("discussionPlaceholder")}
            aria-label={t("discussionPlaceholder")}
            data-testid="analysis-comment-input"
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className={styles.post} disabled={!draft.trim() || addComment.isPending} data-testid="analysis-comment-post">
            {t("discussionPost")}
          </button>
        </form>
      </section>

      {preview && (
        <div className={styles.previewBackdrop} role="presentation" onClick={closePreview}>
          <div
            className={styles.previewFrame}
            role="dialog"
            aria-label={t("evidencePreview", { name: preview.name })}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.previewBar}>
              <span className={styles.previewName}>{preview.name}</span>
              <span className={styles.previewActions}>
                {preview.url && (
                  <a
                    className={styles.previewClose}
                    href={preview.url}
                    download={preview.name}
                    target="_blank"
                    rel="noopener"
                    aria-label={t("evidenceDownload")}
                    onClick={() => track("analysis.evidence_downloaded")}
                  >
                    <IconDownload size={16} />
                  </a>
                )}
                <button type="button" className={styles.previewClose} aria-label={t("evidenceClose")} onClick={closePreview}>
                  <IconX size={16} />
                </button>
              </span>
            </div>
            {preview.url ? (
              <iframe className={styles.previewDoc} title={t("evidencePreview", { name: preview.name })} src={preview.url} />
            ) : (
              <p className={styles.previewMissing}>{t("evidenceUnavailable")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
