"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { IconExternalLink, IconMicrophone } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import styles from "./voice-note.module.css";

/** MIME type to probe with canPlayType, from the presigned URL's path.
 * WhatsApp voice notes are Ogg/Opus, which older Safari cannot play.
 * null = unknown extension: let the element try and rely on onError. */
export function voiceMimeType(url: string): string | null {
  const ext = /\.([a-z0-9]+)(\?|#|$)/i.exec(url.split("?")[0] ?? "")?.[1]?.toLowerCase();
  switch (ext) {
    case "ogg":
    case "oga":
    case "opus":
      return 'audio/ogg; codecs="opus"';
    case "mp3":
      return "audio/mpeg";
    case "m4a":
      return "audio/mp4";
    case "aac":
      return "audio/aac";
    case "amr":
      return "audio/amr";
    case "wav":
      return "audio/wav";
    case "webm":
      return "audio/webm";
    default:
      return null;
  }
}

type Status = "ready" | "unsupported" | "refreshing" | "failed";

interface VoiceNoteProps {
  url: string;
  /** Accessible name of the player, e.g. "Voice note 2". */
  label: string;
}

/**
 * Inline player for a hotline voice note, with the open-in-new-tab link
 * kept as a fallback.
 *
 * - Format: probed with canPlayType; an unplayable format (Ogg/Opus on
 *   older Safari) shows the link only.
 * - Expiry: media URLs are presigned for 1 h. preload="none" means nothing
 *   is fetched until the reviewer presses play, so a playback error is
 *   the first sign of an expired link. The first error refetches the inbox
 *   (fresh presigned URLs flow back in as a new `url`); a second error
 *   gives up and points at the link. Callers key this component on the
 *   URL path (not the full presigned URL) so the retry budget survives
 *   the refresh instead of looping.
 */
export function VoiceNote({ url, label }: VoiceNoteProps) {
  const t = useTranslations("inbox");
  const utils = api.useUtils();
  const [status, setStatus] = useState<Status>("ready");
  const [retried, setRetried] = useState(false);

  const mime = voiceMimeType(url);
  useEffect(() => {
    if (!mime) return;
    const probe = document.createElement("audio");
    if (probe.canPlayType(mime) === "") setStatus("unsupported");
  }, [mime]);

  const onError = () => {
    if (retried) {
      setStatus("failed");
      return;
    }
    setRetried(true);
    setStatus("refreshing");
    void utils.ground.hotlineInbox
      .invalidate()
      .catch(() => undefined)
      .then(() => setStatus((s) => (s === "refreshing" ? "ready" : s)));
  };

  const showPlayer = status === "ready" || status === "refreshing";

  return (
    <div className={styles.voice} data-testid="inbox-voice-note" data-status={status}>
      <div className={styles.header}>
        <IconMicrophone size={14} aria-hidden />
        <span className={styles.label}>{label}</span>
        <a
          className={styles.open}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="inbox-voice-open"
        >
          {t("pane.voiceOpen")}
          <IconExternalLink size={12} aria-hidden />
        </a>
      </div>
      {showPlayer && (
        <audio
          className={styles.player}
          controls
          preload="none"
          src={url}
          aria-label={label}
          onError={onError}
          data-testid="inbox-voice-player"
        />
      )}
      {status !== "ready" && (
        <p className={styles.status} role="status">
          {t(
            status === "unsupported"
              ? "pane.voiceUnsupported"
              : status === "refreshing"
                ? "pane.voiceRefreshing"
                : "pane.voiceFailed",
          )}
        </p>
      )}
    </div>
  );
}
