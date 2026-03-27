"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  IconMapPin,
  IconX,
  IconLoader2,
  IconPhoto,
  IconSend,
  IconVideo,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { ColorSchemeToggle } from "~/components/ui/color-scheme-toggle";

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
  return `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lng).toFixed(4)}°${lng >= 0 ? "E" : "W"}`;
}

/* ── Chat message types ─────────────────────────────────────── */

type MessageVariant = "success" | "queued" | "error" | "welcome";

interface ChatMessage {
  id: string;
  kind: "sent" | "received" | "typing";
  title?: string;
  body?: string;
  locationLabel?: string;
  media?: { id: string; preview: string; isVideo: boolean }[];
  text?: string;
  variant?: MessageVariant;
}

/* ── Typing indicator ───────────────────────────────────────── */

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "14px 16px", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--color-text-muted)",
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Message bubble ─────────────────────────────────────────── */

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.kind === "typing") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8 }}>
        <div style={{ background: "var(--color-bg-muted)", borderRadius: "18px 18px 18px 4px" }}>
          <TypingIndicator />
        </div>
      </div>
    );
  }

  if (msg.kind === "received") {
    const isError = msg.variant === "error";
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 4, paddingLeft: 4, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          CLEAR
        </span>
        <div style={{
          background: isError ? "var(--color-critical-light)" : "var(--color-bg-muted)",
          color: isError ? "var(--color-critical)" : "var(--color-text-primary)",
          borderRadius: "18px 18px 18px 4px",
          padding: "12px 16px",
          maxWidth: "82%",
          fontSize: 15,
          lineHeight: 1.5,
        }}>
          {msg.text}
        </div>
      </div>
    );
  }

  // sent
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
      <div style={{
        background: "var(--color-accent)",
        color: "white",
        borderRadius: "18px 18px 4px 18px",
        padding: "12px 16px",
        maxWidth: "82%",
        fontSize: 15,
        lineHeight: 1.5,
      }}>
        {msg.title && (
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: msg.body ?? msg.locationLabel ?? (msg.media?.length ?? 0) > 0 ? 4 : 0 }}>
            {msg.title}
          </div>
        )}
        {msg.body && <div style={{ opacity: 0.95 }}>{msg.body}</div>}
        {msg.locationLabel && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, opacity: 0.9, fontSize: 13 }}>
            <IconMapPin size={12} strokeWidth={2.5} />
            <span>{msg.locationLabel}</span>
          </div>
        )}
        {msg.media && msg.media.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {msg.media.map((m) => (
              <div key={m.id} style={{ width: 72, height: 72, borderRadius: 8, overflow: "hidden", flexShrink: 0, border: "1.5px solid rgba(255,255,255,0.3)" }}>
                {m.isVideo
                  ? <div style={{ width: "100%", height: "100%", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}><IconVideo size={24} /></div>
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={m.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                }
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────── */

const WELCOME: ChatMessage = {
  id: "welcome",
  kind: "received",
  variant: "welcome",
  text: "Ready to receive your field signals. Type what you observed — first line is the title, the rest is your description. Use @ to tag a location, or tap the pin to capture your coordinates.",
};

export default function ObservePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [draft, setDraft] = useState("");
  const [draftMedia, setDraftMedia] = useState<{ file: File; id: string; preview: string; isVideo: boolean }[]>([]);
  const [locationId, setLocationId] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [atQuery, setAtQuery] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const createSignal = api.signals.create.useMutation();
  const sourcesQuery = api.signals.sources.useQuery(undefined, { staleTime: 1000 * 60 * 10 });
  const locationsQuery = api.locations.list.useQuery(undefined, { staleTime: 1000 * 60 * 10 });
  const utils = api.useUtils();

  const mutateFnRef = useRef(createSignal.mutateAsync);
  useEffect(() => { mutateFnRef.current = createSignal.mutateAsync; });

  useEffect(() => {
    if (!sourcesQuery.data || sourceId) return;
    const sources = sourcesQuery.data;
    const preferred = sources.find((s) => /user|manual|field/i.test(s.name) || /user|manual|field/i.test(s.type));
    const gdacs = sources.find((s) => /gdacs/i.test(s.name));
    const auto = preferred ?? gdacs ?? sources[0];
    if (auto) setSourceId(auto.id);
  }, [sourcesQuery.data, sourceId]);

  const locationOptions = (locationsQuery.data ?? []).map((loc) => ({
    value: loc.id,
    label: loc.parent ? `${loc.name}, ${loc.parent.name}` : loc.name,
  }));

  const filteredLocations = atQuery !== null
    ? locationOptions.filter((o) => o.label.toLowerCase().includes(atQuery.toLowerCase())).slice(0, 6)
    : [];

  const drainQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    const pending = await dbGetPending();
    for (const { key, data } of pending) {
      try {
        await mutateFnRef.current(data);
        await dbRemove(key);
        void utils.signals.list.invalidate();
        setPendingCount((n) => Math.max(0, n - 1));
      } catch { break; }
    }
  }, [utils]);

  useEffect(() => {
    void dbGetPending().then((p) => setPendingCount(p.length));
    void drainQueue();
    window.addEventListener("online", drainQueue);
    return () => window.removeEventListener("online", drainQueue);
  }, [drainQueue]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleDraftChange(val: string) {
    setDraft(val);
    const match = val.match(/@([\w\s]*)$/);
    setAtQuery(match ? (match[1] ?? "") : null);
  }

  function selectLocationFromAt(loc: { value: string; label: string }) {
    setDraft((d) => d.replace(/@[\w\s]*$/, ""));
    setLocationId(loc.value);
    setLocationLabel(loc.label);
    setAtQuery(null);
    textareaRef.current?.focus();
  }

  function captureGPS() {
    if (!navigator.geolocation || gpsLoading) return;
    if (locationLabel) { setLocationId(""); setLocationLabel(""); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationLabel(formatCoords(pos.coords.latitude, pos.coords.longitude));
        setLocationId("");
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files).map((file) => ({
      file,
      id: `${file.name}-${Date.now()}`,
      preview: URL.createObjectURL(file),
      isVideo: file.type.startsWith("video/"),
    }));
    setDraftMedia((p) => [...p, ...incoming]);
  }

  function removeDraftMedia(id: string) {
    setDraftMedia((p) => {
      const item = p.find((m) => m.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return p.filter((m) => m.id !== id);
    });
  }

  const lines = draft.split("\n");
  const titleLine = lines[0]?.trim() ?? "";
  const bodyLines = lines.slice(1).join("\n").trim();
  const canSubmit = draft.trim().length > 0 && sourceId.length > 0 && !submitting;

  function pushReply(msg: ChatMessage) {
    setMessages((prev) => [...prev.filter((m) => m.kind !== "typing"), msg]);
  }

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setAtQuery(null);

    const sentMsg: ChatMessage = {
      id: `sent-${Date.now()}`,
      kind: "sent",
      title: titleLine || undefined,
      body: bodyLines || undefined,
      locationLabel: locationLabel || undefined,
      media: draftMedia.map((m) => ({ id: m.id, preview: m.preview, isVideo: m.isVideo })),
    };

    setMessages((prev) => [...prev, sentMsg]);
    setDraft("");
    setLocationId("");
    setLocationLabel("");
    setDraftMedia([]);

    setTimeout(() => {
      setMessages((prev) => [...prev, { id: `typing-${Date.now()}`, kind: "typing" }]);
    }, 400);

    const payload: QueuedPayload = {
      sourceId,
      title: titleLine || undefined,
      description: bodyLines || titleLine || undefined,
      locationId: locationId || undefined,
    };

    if (!navigator.onLine) {
      await dbQueue(payload);
      setPendingCount((n) => n + 1);
      setTimeout(() => {
        pushReply({ id: `recv-${Date.now()}`, kind: "received", variant: "queued", text: "Got it \u2014 your signal has been saved locally. We\u2019ll send it to your team automatically once you\u2019re back online." });
        setSubmitting(false);
      }, 1200);
      return;
    }

    try {
      await createSignal.mutateAsync(payload);
      void utils.signals.list.invalidate();
      pushReply({ id: `recv-${Date.now()}`, kind: "received", variant: "success", text: "Signal received \u2014 a new entry has been added to your team\u2019s signal list." });
    } catch (err) {
      const isNetworkError = err instanceof Error && (
        err.message.toLowerCase().includes("fetch") ||
        err.message.toLowerCase().includes("network") ||
        err.message.toLowerCase().includes("failed")
      );
      if (isNetworkError) {
        await dbQueue(payload);
        setPendingCount((n) => n + 1);
        pushReply({ id: `recv-${Date.now()}`, kind: "received", variant: "queued", text: "Got it \u2014 your signal has been saved locally. We\u2019ll send it to your team automatically once you\u2019re back online." });
      } else {
        pushReply({ id: `recv-${Date.now()}`, kind: "received", variant: "error", text: "Something went wrong \u2014 your signal wasn\u2019t submitted. Please try again." });
      }
    }

    setSubmitting(false);
  }, [canSubmit, titleLine, bodyLines, locationLabel, locationId, draftMedia, sourceId, createSignal, utils]);

  const hasLocation = !!locationLabel;
  const hasMedia = draftMedia.length > 0;

  return (
    <div style={{ height: "100dvh", background: "var(--color-bg-primary)", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto" }}>

      {/* Accent bar */}
      <div style={{ height: 3, background: "var(--color-accent)", flexShrink: 0 }} />

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 20px", height: 58, background: "var(--color-bg-white)", borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}>
        <Image src="/nrc-logo-square.svg" alt="NRC" width={34} height={34} />
        <span style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.02em", fontFamily: "Calibri, 'Trebuchet MS', sans-serif" }}>CLEAR</span>
        <span style={{ color: "var(--color-border-dark)", fontSize: 17, margin: "0 2px" }}>|</span>
        <span style={{ fontSize: 15, fontWeight: 300, color: "var(--color-text-secondary)" }}>Field Signals</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {pendingCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-warning)", background: "var(--color-warning-light)", padding: "2px 7px", borderRadius: 10 }}>
              {pendingCount} queued
            </span>
          )}
          <ColorSchemeToggle />
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>
        {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
        <div ref={bottomRef} style={{ height: 8 }} />
      </div>

      {/* @ location suggestions */}
      {atQuery !== null && filteredLocations.length > 0 && (
        <div style={{ background: "var(--color-bg-white)", borderTop: "1px solid var(--color-border)", maxHeight: 200, overflowY: "auto", flexShrink: 0 }}>
          {filteredLocations.map((loc) => (
            <button
              key={loc.value}
              onClick={() => selectLocationFromAt(loc)}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", borderBottom: "1px solid var(--color-border)", cursor: "pointer", color: "var(--color-text-primary)", fontSize: 15, textAlign: "left" }}
            >
              <IconMapPin size={15} color="var(--color-accent)" strokeWidth={2.5} />
              {loc.label}
            </button>
          ))}
        </div>
      )}

      {/* Compose */}
      <div style={{ background: "var(--color-bg-white)", borderTop: "1px solid var(--color-border)", padding: "8px 12px 28px", flexShrink: 0 }}>

        {/* Chips */}
        {(hasLocation || hasMedia) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "6px 4px 8px" }}>
            {hasLocation && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--color-accent-light)", border: "1px solid var(--color-border)", borderRadius: 16, padding: "4px 8px", fontSize: 13, fontWeight: 500, color: "var(--color-accent)" }}>
                <IconMapPin size={12} strokeWidth={2.5} />
                <span>{locationLabel}</span>
                <button onClick={() => { setLocationId(""); setLocationLabel(""); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 2px", color: "inherit", display: "flex", alignItems: "center" }}>
                  <IconX size={11} />
                </button>
              </div>
            )}
            {draftMedia.map((m) => (
              <div key={m.id} style={{ position: "relative", width: 48, height: 48, borderRadius: 8, overflow: "hidden", border: "1px solid var(--color-border)", flexShrink: 0 }}>
                {m.isVideo
                  ? <div style={{ width: "100%", height: "100%", background: "var(--color-bg-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}><IconVideo size={18} color="var(--color-text-muted)" /></div>
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={m.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                }
                <button onClick={() => removeDraftMedia(m.id)} style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white", padding: 0 }}>
                  <IconX size={9} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input row */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>

          <button onClick={captureGPS} disabled={gpsLoading} title="Capture location"
            style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: hasLocation ? "var(--color-accent-light)" : "transparent", border: "none", borderRadius: "50%", color: hasLocation ? "var(--color-accent)" : "var(--color-text-muted)", cursor: gpsLoading ? "default" : "pointer", flexShrink: 0, transition: "background 150ms, color 150ms" }}>
            {gpsLoading ? <IconLoader2 size={20} style={{ animation: "spin 1s linear infinite" }} /> : <IconMapPin size={20} />}
          </button>

          <button onClick={() => mediaInputRef.current?.click()} title="Add photo or video"
            style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: hasMedia ? "var(--color-accent-light)" : "transparent", border: "none", borderRadius: "50%", color: hasMedia ? "var(--color-accent)" : "var(--color-text-muted)", cursor: "pointer", flexShrink: 0, transition: "background 150ms, color 150ms", position: "relative" }}>
            <IconPhoto size={20} />
            {hasMedia && (
              <span style={{ position: "absolute", top: 6, right: 6, width: 14, height: 14, borderRadius: "50%", background: "var(--color-accent)", color: "white", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {draftMedia.length}
              </span>
            )}
          </button>

          <textarea
            ref={textareaRef}
            placeholder="What did you observe?"
            value={draft}
            onChange={(e) => handleDraftChange(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 640) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            rows={1}
            style={{ flex: 1, border: "1.5px solid var(--color-border)", borderRadius: 20, padding: "10px 16px", fontSize: 16, lineHeight: 1.5, outline: "none", fontFamily: "inherit", color: "var(--color-text-primary)", background: "var(--color-bg-primary)", resize: "none", maxHeight: 140, overflowY: "auto", boxSizing: "border-box", transition: "border-color 150ms" }}
            className="observe-input"
          />

          <button
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            style={{ width: 42, height: 42, borderRadius: "50%", background: canSubmit ? "var(--color-accent)" : "var(--color-border-dark)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: canSubmit ? "pointer" : "default", transition: "background 200ms", color: "white", flexShrink: 0 }}>
            {submitting ? <IconLoader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <IconSend size={18} style={{ transform: "translateX(1px)" }} />}
          </button>
        </div>
      </div>

      <input ref={mediaInputRef} type="file" accept="image/*,video/*" capture="environment" multiple style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
    </div>
  );
}
