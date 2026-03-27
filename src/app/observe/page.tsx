"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  IconMapPin,
  IconX,
  IconCircleCheck,
  IconLoader2,
  IconPhoto,
  IconSend,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { ColorSchemeToggle } from "~/components/ui/color-scheme-toggle";

/* ── Types ─────────────────────────────────────────────────── */

type Step = "form" | "submitting" | "success" | "queued";

/* ── IndexedDB offline queue ────────────────────────────────── */

type QueuedPayload = {
  sourceId: string;
  title?: string;
  description?: string;
  locationId?: string;
};

const DB_NAME = "clear-observe";
const DB_STORE = "pending-signals";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE, { autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbQueue(payload: QueuedPayload): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).add(payload);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGetPending(): Promise<{ key: IDBValidKey; data: QueuedPayload }[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const results: { key: IDBValidKey; data: QueuedPayload }[] = [];
    const req = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).openCursor();
    req.onsuccess = (e) => {
      const cur = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cur) { results.push({ key: cur.key, data: cur.value as QueuedPayload }); cur.continue(); }
      else resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

async function dbRemove(key: IDBValidKey): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function formatCoords(lat: number, lng: number) {
  return `${Math.abs(lat).toFixed(3)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(3)}° ${lng >= 0 ? "E" : "W"}`;
}

/* ── Success screen ─────────────────────────────────────────── */

function SuccessScreen({ onAnother, queued }: { onAnother: () => void; queued?: boolean }) {
  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        background: "var(--color-bg-white)",
        textAlign: "center",
      }}
    >
      <IconCircleCheck
        size={72}
        color={queued ? "var(--color-warning)" : "var(--color-success)"}
        className="observe-success-icon"
        style={{ strokeWidth: 1.5, marginBottom: 24 }}
      />
      <h2 style={{ fontSize: 26, fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
        {queued ? "Saved for later" : "Signal submitted"}
      </h2>
      <p style={{ fontSize: 16, color: "var(--color-text-muted)", margin: "0 0 36px", maxWidth: 260, lineHeight: 1.5 }}>
        {queued
          ? "No connection \u2014 your signal is queued and will be sent automatically when you\u2019re back online."
          : "Your observation is now visible to your team in CLEAR."}
      </p>
      <button
        onClick={onAnother}
        style={{
          padding: "16px 32px",
          background: "var(--color-accent)",
          color: "white",
          border: "none",
          fontSize: 16,
          fontWeight: 600,
          cursor: "pointer",
          borderRadius: 2,
        }}
      >
        Submit another
      </button>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────── */

export default function ObservePage() {
  const [step, setStep] = useState<Step>("form");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [media, setMedia] = useState<{ file: File; id: string; preview: string }[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(false);

  const mediaInputRef = useRef<HTMLInputElement>(null);
  const createSignal = api.signals.create.useMutation();
  const sourcesQuery = api.signals.sources.useQuery(undefined, { staleTime: 1000 * 60 * 10 });
  const utils = api.useUtils();

  const mutateFnRef = useRef(createSignal.mutateAsync);
  useEffect(() => { mutateFnRef.current = createSignal.mutateAsync; });

  // Auto-select source
  useEffect(() => {
    if (!sourcesQuery.data || sourceId) return;
    const sources = sourcesQuery.data;
    const preferred = sources.find((s) => /user|manual|field/i.test(s.name) || /user|manual|field/i.test(s.type));
    const gdacs = sources.find((s) => /gdacs/i.test(s.name));
    const auto = preferred ?? gdacs ?? sources[0];
    if (auto) setSourceId(auto.id);
  }, [sourcesQuery.data, sourceId]);

  const drainQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    const pending = await dbGetPending();
    for (const { key, data } of pending) {
      try {
        await mutateFnRef.current(data);
        await dbRemove(key);
        void utils.signals.list.invalidate();
        setPendingCount((n) => Math.max(0, n - 1));
      } catch {
        break;
      }
    }
  }, [utils]);

  useEffect(() => {
    void dbGetPending().then((p) => setPendingCount(p.length));
    void drainQueue();
    window.addEventListener("online", drainQueue);
    return () => window.removeEventListener("online", drainQueue);
  }, [drainQueue]);

  function captureGPS() {
    if (!navigator.geolocation || gpsLoading) return;
    // Toggle off if already captured
    if (lat !== null) {
      setLat(null);
      setLng(null);
      setLocationLabel("");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocationLabel(formatCoords(pos.coords.latitude, pos.coords.longitude));
        setGpsLoading(false);
      },
      () => {
        setError("Could not get location. Check permissions.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files).map((file) => ({
      file,
      id: `${file.name}-${file.size}-${Date.now()}`,
      preview: URL.createObjectURL(file),
    }));
    setMedia((p) => [...p, ...incoming]);
  }

  function removeMedia(id: string) {
    setMedia((p) => {
      const item = p.find((m) => m.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return p.filter((m) => m.id !== id);
    });
  }

  const canSubmit = text.trim().length > 0 && sourceId.length > 0;
  const isSubmitting = step === "submitting";

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setError(null);
    setStep("submitting");

    const description = text.trim();
    const payload: QueuedPayload = {
      sourceId,
      title: title.trim() || undefined,
      description,
    };

    if (!navigator.onLine) {
      await dbQueue(payload);
      setPendingCount((n) => n + 1);
      setStep("queued");
      return;
    }

    try {
      await createSignal.mutateAsync(payload);
      void utils.signals.list.invalidate();
      setStep("success");
    } catch (err) {
      const isNetworkError = err instanceof Error && (
        err.message.toLowerCase().includes("fetch") ||
        err.message.toLowerCase().includes("network") ||
        err.message.toLowerCase().includes("failed")
      );
      if (isNetworkError) {
        await dbQueue(payload);
        setPendingCount((n) => n + 1);
        setStep("queued");
      } else {
        setError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
        setStep("form");
      }
    }
  }, [canSubmit, createSignal, text, sourceId, utils]);

  function reset() {
    media.forEach((m) => URL.revokeObjectURL(m.preview));
    setTitle("");
    setText("");
    setLat(null);
    setLng(null);
    setLocationLabel("");
    setMedia([]);
    setError(null);
    setStep("form");
  }

  if (step === "success") return <SuccessScreen onAnother={reset} />;
  if (step === "queued") return <SuccessScreen onAnother={reset} queued />;

  const hasLocation = lat !== null;
  const hasMedia = media.length > 0;

  return (
    <div
      style={{
        height: "100dvh",
        background: "var(--color-bg-white)",
        display: "flex",
        flexDirection: "column",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      {/* Accent top bar */}
      <div style={{ height: 3, background: "var(--color-accent)", flexShrink: 0 }} />

      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 20px",
          height: 58,
          background: "var(--color-bg-white)",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <Image src="/nrc-logo-square.svg" alt="NRC" width={34} height={34} />
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--color-text-primary)",
            letterSpacing: "-0.02em",
            fontFamily: "Calibri, 'Trebuchet MS', sans-serif",
          }}
        >
          CLEAR
        </span>
        <span style={{ color: "var(--color-border-dark)", fontSize: 17, margin: "0 2px" }}>|</span>
        <span style={{ fontSize: 15, fontWeight: 300, color: "var(--color-text-secondary)", letterSpacing: "0.01em" }}>
          Field Signals
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {pendingCount > 0 && (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-warning)",
              background: "var(--color-warning-light)",
              padding: "2px 7px",
              borderRadius: 10,
            }}>
              {pendingCount} queued
            </span>
          )}
          <ColorSchemeToggle />
        </div>
      </div>

      {/* Compose area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Chips + textarea */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 0" }}>

          {/* Attachment chips */}
          {(hasLocation || hasMedia) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>

              {hasLocation && (
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--color-accent-light)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 20,
                  padding: "6px 8px 6px 10px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-accent)",
                }}>
                  <IconMapPin size={13} strokeWidth={2.5} />
                  <span>{locationLabel}</span>
                  <button
                    onClick={() => { setLat(null); setLng(null); setLocationLabel(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 2px", color: "inherit", display: "flex", alignItems: "center" }}
                  >
                    <IconX size={12} />
                  </button>
                </div>
              )}

              {media.map(({ id, file, preview }) => (
                <div key={id} style={{ position: "relative", width: 52, height: 52, borderRadius: 8, overflow: "hidden", border: "1px solid var(--color-border)", flexShrink: 0 }}>
                  {file.type.startsWith("video/") ? (
                    <div style={{ width: "100%", height: "100%", background: "var(--color-bg-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <IconPhoto size={20} color="var(--color-text-muted)" />
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  )}
                  <button
                    onClick={() => removeMedia(id)}
                    style={{ position: "absolute", top: 3, right: 3, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white", padding: 0 }}
                  >
                    <IconX size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Title */}
          <input
            type="text"
            autoFocus
            placeholder="Title"
            value={title}
            onChange={(e) => { const v = e.currentTarget.value; setTitle(v); }}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--color-text-primary)",
              background: "transparent",
              fontFamily: "inherit",
              boxSizing: "border-box",
              marginBottom: 14,
            }}
          />

          {/* Divider */}
          <div style={{ height: 1, background: "var(--color-border)", marginBottom: 16 }} />

          {/* Description */}
          <textarea
            placeholder="What did you observe?"
            value={text}
            onChange={(e) => { const v = e.currentTarget.value; setText(v); }}
            style={{
              width: "100%",
              minHeight: 180,
              border: "none",
              outline: "none",
              fontSize: 19,
              lineHeight: 1.65,
              color: "var(--color-text-primary)",
              background: "transparent",
              resize: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />

          {/* Error */}
          {error && (
            <div style={{
              marginTop: 8,
              padding: "10px 14px",
              background: "var(--color-critical-light)",
              color: "var(--color-critical)",
              fontSize: 14,
              borderRadius: 4,
            }}>
              {error}
            </div>
          )}

          <div style={{ height: 80 }} />
        </div>

        {/* Action bar */}
        <div
          style={{
            padding: "10px 16px 28px",
            background: "var(--color-bg-white)",
            borderTop: "1px solid var(--color-border)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {/* Location */}
          <button
            onClick={captureGPS}
            disabled={gpsLoading}
            title={hasLocation ? "Clear location" : "Capture location"}
            className="observe-locate"
            style={{
              width: 46,
              height: 46,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: hasLocation ? "var(--color-accent-light)" : "transparent",
              border: "none",
              borderRadius: "50%",
              color: hasLocation ? "var(--color-accent)" : "var(--color-text-muted)",
              cursor: gpsLoading ? "default" : "pointer",
              transition: "background 150ms, color 150ms",
              flexShrink: 0,
            }}
          >
            {gpsLoading
              ? <IconLoader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
              : <IconMapPin size={22} />
            }
          </button>

          {/* Media */}
          <button
            onClick={() => mediaInputRef.current?.click()}
            title="Add photo or video"
            style={{
              width: 46,
              height: 46,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: hasMedia ? "var(--color-accent-light)" : "transparent",
              border: "none",
              borderRadius: "50%",
              color: hasMedia ? "var(--color-accent)" : "var(--color-text-muted)",
              cursor: "pointer",
              transition: "background 150ms, color 150ms",
              position: "relative",
              flexShrink: 0,
            }}
          >
            <IconPhoto size={22} />
            {hasMedia && (
              <span style={{
                position: "absolute",
                top: 7,
                right: 7,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "var(--color-accent)",
                color: "white",
                fontSize: 9,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
              }}>
                {media.length}
              </span>
            )}
          </button>

          <div style={{ flex: 1 }} />

          {/* Send */}
          <button
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || isSubmitting}
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              background: canSubmit && !isSubmitting ? "var(--color-accent)" : "var(--color-border-dark)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: canSubmit && !isSubmitting ? "pointer" : "default",
              transition: "background 200ms, transform 100ms",
              color: "white",
              flexShrink: 0,
            }}
          >
            {isSubmitting
              ? <IconLoader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
              : <IconSend size={20} style={{ transform: "translateX(1px)" }} />
            }
          </button>

          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            multiple
            style={{ display: "none" }}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>
    </div>
  );
}
