"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  IconMapPin,
  IconX,
  IconLoader2,
  IconPhoto,
  IconSend,
  IconVideo,
} from "@tabler/icons-react";
import { NrcLogoMark } from "~/components/ui/nrc-logo-mark";
import { api } from "~/trpc/react";
import type { GqlSignal } from "~/lib/types/graphql";
import {
  classifyObserveSubmitError,
  drainQueuedFieldSignals,
  locationFieldsForPayload,
  parseAtMentionQuery,
  resolveTeamIdForSubmit,
  stripTrailingAtMention,
  type QueuedFieldSignal,
} from "~/lib/observe/field-signal";

/* ── IndexedDB offline queue ────────────────────────────────── */

type QueuedPayload = QueuedFieldSignal;

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
  content?: ReactNode;
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
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 4, paddingInlineStart: 4, letterSpacing: "0.05em", textTransform: "uppercase" }}>
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
          {msg.content ?? msg.text}
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

/* ── Signals list ───────────────────────────────────────────── */

function SignalCard({ signal }: { signal: GqlSignal }) {
  const t = useTranslations("observe.signals");
  const format = useFormatter();
  const location = signal.generalLocation ?? signal.originLocation;
  const hasEvents = signal.events.length > 0;

  return (
    <div style={{ background: "var(--color-bg-white)", borderRadius: 10, padding: "14px 16px", marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 8px rgba(0,0,0,0.04)" }}>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-accent)", background: "var(--color-accent-light)", padding: "2px 8px", borderRadius: 10 }}>
          {signal.source.name}
        </span>
        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{format.relativeTime(new Date(signal.publishedAt))}</span>
      </div>

      {signal.title && <div style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)", marginBottom: 4, lineHeight: 1.35 }}>{signal.title}</div>}
      {signal.description && <div style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.45, marginBottom: location ?? hasEvents ? 8 : 0 }}>{signal.description.length > 120 ? signal.description.slice(0, 120) + "…" : signal.description}</div>}
      {(location ?? hasEvents) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          {location && <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--color-text-muted)", fontSize: 12 }}><IconMapPin size={11} strokeWidth={2.5} /><span>{location.name}</span></div>}
          {hasEvents && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-info)", background: "var(--color-info-light)", padding: "2px 7px", borderRadius: 8 }}>{t("events", { count: signal.events.length })}</span>}
        </div>
      )}
    </div>
  );
}

function SignalsList({ teamId }: { teamId?: string }) {
  const t = useTranslations("observe.signals");
  const signalsQuery = api.signals.list.useQuery(
    { teamId },
    { staleTime: 1000 * 60, enabled: Boolean(teamId) },
  );

  if (signalsQuery.isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "var(--color-text-muted)", fontSize: 14 }}>
        <IconLoader2 size={20} style={{ animation: "spin 1s linear infinite", marginInlineEnd: 8 }} />
        {t("loading")}
      </div>
    );
  }

  const signals = (signalsQuery.data ?? []).slice().sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  if (signals.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, color: "var(--color-text-muted)", fontSize: 14, gap: 8 }}>
        <IconPhoto size={32} strokeWidth={1.5} />
        {t("empty")}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 24px" }}>
      {signals.map((s) => <SignalCard key={s.id} signal={s} />)}
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────── */

function makeWelcome(t: ReturnType<typeof useTranslations<"observe">>): ChatMessage {
  const iconChip: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, background: "rgba(255,255,255,0.15)", verticalAlign: "middle", margin: "0 2px", flexShrink: 0 };
  const strong = (chunks: ReactNode) => <strong>{chunks}</strong>;
  return {
    id: "welcome",
    kind: "received",
    variant: "welcome",
    content: (
      <div style={{ fontSize: 14, lineHeight: 1.55 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{t("welcome.heading")}</div>
        <ul style={{ margin: 0, paddingInlineStart: 0, display: "flex", flexDirection: "column", gap: 8, listStyle: "none" }}>
          <li style={{ display: "flex", gap: 8 }}><span>•</span><span>{t.rich("welcome.bullet1", { strong })}</span></li>
          <li style={{ display: "flex", gap: 8 }}><span>•</span><span>{t.rich("welcome.bullet2", { strong, locationIcon: () => <span style={iconChip}><IconMapPin size={13} strokeWidth={2.5} /></span> })}</span></li>
          <li style={{ display: "flex", gap: 8 }}><span>•</span><span>{t.rich("welcome.bullet3", { mediaIcon: () => <span style={iconChip}><IconPhoto size={13} strokeWidth={2.5} /></span> })}</span></li>
          <li style={{ display: "flex", gap: 8 }}><span>•</span><span>{t.rich("welcome.bullet4", { strong })}</span></li>
        </ul>
      </div>
    ),
  };
}

export default function ObservePage() {
  const t = useTranslations("observe");
  const [activeTab, setActiveTab] = useState<"submit" | "signals">("submit");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [makeWelcome(t)]);
  const [draft, setDraft] = useState("");
  const [draftMedia, setDraftMedia] = useState<{ file: File; id: string; preview: string; isVideo: boolean }[]>([]);
  const [locationId, setLocationId] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sourceId, setSourceId] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [atQuery, setAtQuery] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const utils = api.useUtils();
  const createSignal = api.signals.createManual.useMutation({
    onSuccess: async () => {
      await utils.signals.invalidate();
    },
  });
  const sourcesQuery = api.signals.sources.useQuery(undefined, { staleTime: 1000 * 60 * 10 });
  const locationsQuery = api.locations.list.useQuery(undefined, { staleTime: 1000 * 60 * 10 });
  // /observe lives outside the (app) group and has no team switcher, so we
  // fall back to the user's persisted defaultTeamId to satisfy the backend's
  // team-scoped createManualSignal gate.
  const meQuery = api.auth.me.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const defaultTeamId = meQuery.data?.user?.defaultTeamId ?? undefined;
  const meStatus = meQuery.isPending ? "pending" : meQuery.isError ? "error" : "success";

  const mutateFnRef = useRef(createSignal.mutateAsync);
  const drainingRef = useRef(false);
  useEffect(() => { mutateFnRef.current = createSignal.mutateAsync; });

  useEffect(() => {
    if (!sourcesQuery.data || sourceId) return;
    const sources = sourcesQuery.data;
    const auto =
      sources.find((s) => s.name === "field_officer") ??
      sources.find((s) => /user|manual|field/i.test(s.name) || /user|manual|field/i.test(s.type)) ??
      sources[0];
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
    if (drainingRef.current) return;
    if (meStatus === "pending") return;
    drainingRef.current = true;
    try {
      const pending = await dbGetPending();
      const result = await drainQueuedFieldSignals({
        isOnline: navigator.onLine,
        pending,
        fallbackTeamId: defaultTeamId,
        create: async (data) => {
          await mutateFnRef.current(data);
        },
        acknowledge: async (key) => {
          await dbRemove(key);
          void utils.signals.invalidate();
          setPendingCount((n) => Math.max(0, n - 1));
        },
      });
      if (result.stop === "noTeam") {
        pushReply({
          id: `recv-${Date.now()}`,
          kind: "received",
          variant: "error",
          text: t("replies.noTeam"),
        });
      }
      if (result.sent > 0) {
        pushReply({
          id: `recv-${Date.now()}`,
          kind: "received",
          variant: "success",
          text: t("replies.drained", { count: result.sent }),
        });
      }
    } finally {
      drainingRef.current = false;
    }
  }, [utils, defaultTeamId, meStatus, t]);

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
    setAtQuery(parseAtMentionQuery(val));
  }

  function selectLocationFromAt(loc: { value: string; label: string }) {
    setDraft((d) => stripTrailingAtMention(d));
    setLocationId(loc.value);
    setLocationLabel(loc.label);
    setGpsCoords(null);
    setAtQuery(null);
    textareaRef.current?.focus();
  }

  function clearLocation() {
    setLocationId("");
    setLocationLabel("");
    setGpsCoords(null);
  }

  function captureGPS() {
    if (gpsLoading) return;
    if (locationLabel) {
      clearLocation();
      return;
    }
    if (!navigator.geolocation) {
      pushReply({
        id: `recv-${Date.now()}`,
        kind: "received",
        variant: "error",
        text: t("replies.gpsUnsupported"),
      });
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGpsCoords({ lat, lng });
        setLocationLabel(formatCoords(lat, lng));
        setLocationId("");
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        const text =
          err.code === err.PERMISSION_DENIED
            ? t("replies.gpsDenied")
            : err.code === err.TIMEOUT
              ? t("replies.gpsTimeout")
              : t("replies.gpsUnavailable");
        pushReply({
          id: `recv-${Date.now()}`,
          kind: "received",
          variant: "error",
          text,
        });
      },
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

  const cleanDraft = stripTrailingAtMention(draft).trimEnd();
  const lines = cleanDraft.split("\n");
  const titleLine = lines[0]?.trim() ?? "";
  const bodyLines = lines.slice(1).join("\n").trim();
  const canSubmit = cleanDraft.trim().length > 0 && sourceId.length > 0 && !submitting;

  function pushReply(msg: ChatMessage) {
    setMessages((prev) => [...prev.filter((m) => m.kind !== "typing"), msg]);
  }

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    if (!navigator.onLine && draftMedia.length > 0) {
      pushReply({
        id: `recv-${Date.now()}`,
        kind: "received",
        variant: "error",
        text: t("replies.mediaNeedsOnline"),
      });
      return;
    }

    const teamGate = resolveTeamIdForSubmit({ meStatus, defaultTeamId });
    if (!teamGate.ok) {
      if (teamGate.reason === "loading") return;
      pushReply({
        id: `recv-${Date.now()}`,
        kind: "received",
        variant: "error",
        text: teamGate.reason === "noTeam" ? t("replies.noTeam") : t("replies.error"),
      });
      return;
    }

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
    setGpsCoords(null);
    setDraftMedia([]);

    setTimeout(() => {
      setMessages((prev) => [...prev, { id: `typing-${Date.now()}`, kind: "typing" }]);
    }, 400);

    const payload: QueuedPayload = {
      sourceId,
      title: titleLine || "Field observation",
      description: bodyLines || titleLine || "Field observation",
      ...locationFieldsForPayload({ locationId, gps: gpsCoords }),
      teamId: teamGate.teamId,
    };

    if (!navigator.onLine) {
      await dbQueue(payload);
      setPendingCount((n) => n + 1);
      setTimeout(() => {
        pushReply({ id: `recv-${Date.now()}`, kind: "received", variant: "queued", text: t("replies.queued") });
        setSubmitting(false);
      }, 1200);
      return;
    }

    try {
      let mediaKeys: string[] | undefined;
      if (draftMedia.length > 0) {
        const formData = new FormData();
        for (const m of draftMedia) {
          if (m.file) formData.append("files", m.file);
        }
        if (formData.has("files")) {
          const uploadResp = await fetch("/api/proxy/upload", { method: "POST", body: formData });
          if (uploadResp.ok) {
            const uploadData = (await uploadResp.json()) as { keys: string[] };
            mediaKeys = uploadData.keys;
          }
        }
      }

      await createSignal.mutateAsync({ ...payload, mediaUrls: mediaKeys });
      void utils.signals.invalidate();
      pushReply({ id: `recv-${Date.now()}`, kind: "received", variant: "success", text: t("replies.success") });
    } catch (err) {
      const failure = classifyObserveSubmitError(err);
      if (failure === "network") {
        await dbQueue(payload);
        setPendingCount((n) => n + 1);
        pushReply({ id: `recv-${Date.now()}`, kind: "received", variant: "queued", text: t("replies.queued") });
      } else if (failure === "noTeam") {
        pushReply({ id: `recv-${Date.now()}`, kind: "received", variant: "error", text: t("replies.noTeam") });
      } else {
        pushReply({ id: `recv-${Date.now()}`, kind: "received", variant: "error", text: t("replies.error") });
      }
    }

    setSubmitting(false);
  }, [canSubmit, titleLine, bodyLines, locationLabel, locationId, gpsCoords, draftMedia, sourceId, defaultTeamId, meStatus, createSignal, utils, t]);

  const hasLocation = !!locationLabel;
  const hasMedia = draftMedia.length > 0;

  return (
    <div style={{ height: "100dvh", background: "var(--color-bg-primary)", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto" }}>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 20px", height: 58, background: "var(--color-bg-white)", borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}>
        <NrcLogoMark size={34} />
        <span style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.02em", fontFamily: "Calibri, 'Trebuchet MS', sans-serif" }}>CLEAR</span>
        <span style={{ color: "var(--color-border-dark)", fontSize: 17, margin: "0 2px" }}>|</span>
        <span style={{ fontSize: 15, fontWeight: 300, color: "var(--color-text-secondary)" }}>{t("header.appName")}</span>
        <div style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {pendingCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-warning)", background: "var(--color-warning-light)", padding: "2px 7px", borderRadius: 10 }}>
              {t("header.queued", { count: pendingCount })}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "6px 16px", background: "var(--color-bg-white)", borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}>
        {(["submit", "signals"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "4px 20px",
              borderRadius: 20,
              border: "none",
              background: activeTab === tab ? "var(--color-accent)" : "transparent",
              color: activeTab === tab ? "white" : "var(--color-text-muted)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 150ms, color 150ms",
            }}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* Signals list tab */}
      {activeTab === "signals" && <SignalsList teamId={defaultTeamId} />}

      {/* Submit tab */}
      {activeTab === "submit" && <>

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
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", borderBottom: "1px solid var(--color-border)", cursor: "pointer", color: "var(--color-text-primary)", fontSize: 15, textAlign: "start" }}
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
                <button onClick={clearLocation} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 2px", color: "inherit", display: "flex", alignItems: "center" }}>
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
                <button onClick={() => removeDraftMedia(m.id)} style={{ position: "absolute", top: 2, insetInlineEnd: 2, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white", padding: 0 }}>
                  <IconX size={9} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input row */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>

          <button onClick={captureGPS} disabled={gpsLoading} title={t("compose.captureLocation")}
            style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: hasLocation ? "var(--color-accent-light)" : "transparent", border: "none", borderRadius: "50%", color: hasLocation ? "var(--color-accent)" : "var(--color-text-muted)", cursor: gpsLoading ? "default" : "pointer", flexShrink: 0, transition: "background 150ms, color 150ms" }}>
            {gpsLoading ? <IconLoader2 size={20} style={{ animation: "spin 1s linear infinite" }} /> : <IconMapPin size={20} />}
          </button>

          <button onClick={() => mediaInputRef.current?.click()} title={t("compose.addMedia")}
            style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: hasMedia ? "var(--color-accent-light)" : "transparent", border: "none", borderRadius: "50%", color: hasMedia ? "var(--color-accent)" : "var(--color-text-muted)", cursor: "pointer", flexShrink: 0, transition: "background 150ms, color 150ms", position: "relative" }}>
            <IconPhoto size={20} />
            {hasMedia && (
              <span style={{ position: "absolute", top: 6, insetInlineEnd: 6, width: 14, height: 14, borderRadius: "50%", background: "var(--color-accent)", color: "white", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {draftMedia.length}
              </span>
            )}
          </button>

          <textarea
            ref={textareaRef}
            placeholder={t("compose.placeholder")}
            value={draft}
            onChange={(e) => {
              handleDraftChange(e.currentTarget.value);
              e.currentTarget.style.height = "auto";
              e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
            }}
            onKeyDown={undefined}
            rows={1}
            style={{ flex: 1, border: "1.5px solid var(--color-border)", borderRadius: 20, padding: "10px 16px", fontSize: 16, lineHeight: 1.5, outline: "none", fontFamily: "inherit", color: "var(--color-text-primary)", background: "var(--color-bg-primary)", resize: "none", maxHeight: 240, overflowY: "auto", boxSizing: "border-box", transition: "border-color 150ms" }}
            className="observe-input"
          />

          <button
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            title={t("compose.send")}
            aria-label={t("compose.send")}
            style={{ width: 42, height: 42, borderRadius: "50%", background: canSubmit ? "var(--color-accent)" : "var(--color-border-dark)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: canSubmit ? "pointer" : "default", transition: "background 200ms", color: "white", flexShrink: 0 }}>
            {submitting ? <IconLoader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <IconSend size={18} style={{ transform: "translateX(1px)" }} />}
          </button>
        </div>
      </div>

      <input ref={mediaInputRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />

      </> /* end submit tab */}
    </div>
  );
}
