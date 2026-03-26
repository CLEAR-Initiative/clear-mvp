"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  IconMapPin,
  IconX,
  IconCircleCheck,
  IconLoader2,
  IconPlus,
  IconPhoto,
  IconVideo,
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


interface FormState {
  description: string;
  title: string;
  sourceId: string;
  locationId: string;
  locationLabel: string;
  lat: number | null;
  lng: number | null;
  media: { file: File; id: string; preview: string }[];
}

const EMPTY_FORM: FormState = {
  description: "",
  title: "",
  sourceId: "",
  locationId: "",
  locationLabel: "",
  lat: null,
  lng: null,
  media: [],
};

function formatCoords(lat: number, lng: number) {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
}

const FIELD_LABEL: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--color-text-muted)",
  marginBottom: 8,
};

const INPUT: React.CSSProperties = {
  width: "100%",
  padding: "10px 0",
  border: "none",
  borderBottom: "1px solid var(--color-border)",
  fontSize: 15,
  outline: "none",
  fontFamily: "inherit",
  color: "var(--color-text-primary)",
  background: "transparent",
  boxSizing: "border-box",
  borderRadius: 0,
  transition: "border-color 150ms",
};

/* ── Location field ─────────────────────────────────────────── */

function LocationField({
  form,
  setForm,
  locationOptions,
  locationsLoading,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  locationOptions: { value: string; label: string }[];
  locationsLoading: boolean;
}) {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const hasLocation = form.lat !== null || !!form.locationId;

  function captureGPS() {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        setForm((p) => ({
          ...p,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          locationLabel: formatCoords(pos.coords.latitude, pos.coords.longitude),
          locationId: "",
        }));
        setOpen(false);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    setForm((p) => ({ ...p, lat: null, lng: null, locationId: "", locationLabel: "" }));
    setSearch("");
  }

  const filtered = locationOptions
    .filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 6);

  return (
    <div style={{ position: "relative" }}>
      <label style={FIELD_LABEL}>Location</label>

      {/* Input row */}
      <div style={{ display: "flex" }}>
        <div
          onClick={() => !hasLocation && setOpen((v) => !v)}
          style={{
            flex: 1,
            padding: "10px 0",
            border: "none",
            borderBottom: `1px solid ${hasLocation ? "var(--color-success)" : "var(--color-border)"}`,
            fontSize: 15,
            color: hasLocation ? "var(--color-text-primary)" : "var(--color-text-muted)",
            background: "transparent",
            cursor: hasLocation ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
            overflow: "hidden",
            transition: "border-color 150ms",
          }}
        >
          {hasLocation && <IconMapPin size={14} color="var(--color-success)" style={{ flexShrink: 0 }} />}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {hasLocation ? form.locationLabel : locationsLoading ? "Loading…" : "Select location"}
          </span>
          {hasLocation && (
            <button
              onClick={clear}
              style={{ marginLeft: "auto", marginRight: 8, background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--color-text-muted)", flexShrink: 0, display: "flex" }}
            >
              <IconX size={13} />
            </button>
          )}
        </div>

        {/* Locate me button */}
        <button
          onClick={captureGPS}
          disabled={gpsLoading}
          title="Use my location"
          className="observe-locate"
          style={{
            width: 40,
            flexShrink: 0,
            background: "var(--color-accent)",
            border: "1px solid var(--color-accent)",
            color: "white",
            cursor: gpsLoading ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 150ms",
          }}
        >
          {gpsLoading
            ? <IconLoader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            : <IconMapPin size={16} />
          }
        </button>
      </div>

      {/* Dropdown */}
      {open && !hasLocation && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "var(--color-bg-white)",
            border: "1px solid var(--color-border)",
            borderTop: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <input
            type="text"
            placeholder="Search…"
            value={search}
            autoFocus
            onChange={(e) => setSearch(e.target.value)}
            className="observe-input"
            style={{ ...INPUT, padding: "10px 12px", borderBottom: "1px solid var(--color-border)" }}
          />
          {filtered.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setForm((p) => ({ ...p, locationId: opt.value, locationLabel: opt.label, lat: null, lng: null }));
                setOpen(false);
                setSearch("");
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                fontSize: 13,
                background: "none",
                border: "none",
                borderBottom: "1px solid var(--color-border)",
                cursor: "pointer",
                color: "var(--color-text-primary)",
              }}
            >
              {opt.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "10px 12px", fontSize: 13, color: "var(--color-text-muted)" }}>No results</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Media gallery ──────────────────────────────────────────── */

function MediaField({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files).map((file) => ({
      file,
      id: `${file.name}-${file.size}-${Date.now()}`,
      preview: URL.createObjectURL(file),
    }));
    setForm((p) => ({ ...p, media: [...p.media, ...incoming] }));
  }

  function remove(id: string) {
    setForm((p) => {
      const item = p.media.find((m) => m.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return { ...p, media: p.media.filter((m) => m.id !== id) };
    });
  }

  const hasMedia = form.media.length > 0;

  return (
    <div>
      <label style={FIELD_LABEL}>Media</label>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {/* Thumbnails */}
        {form.media.map(({ id, file, preview }) => (
          <div
            key={id}
            style={{
              position: "relative",
              width: 72,
              height: 72,
              flexShrink: 0,
              border: "1px solid var(--color-border)",
              overflow: "hidden",
            }}
          >
            {file.type.startsWith("video/") ? (
              <div style={{ width: "100%", height: "100%", background: "var(--color-text-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IconVideo size={24} color="white" />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            )}
            <button
              onClick={() => remove(id)}
              style={{
                position: "absolute",
                top: 3,
                right: 3,
                background: "rgba(0,0,0,0.55)",
                border: "none",
                borderRadius: "50%",
                width: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "white",
                padding: 0,
              }}
            >
              <IconX size={11} />
            </button>
          </div>
        ))}

        {/* Add button */}
        <button
          onClick={() => inputRef.current?.click()}
          style={{
            width: hasMedia ? 72 : "100%",
            height: hasMedia ? 72 : 52,
            border: "1.5px dashed var(--color-border-dark)",
            background: "var(--color-bg-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            cursor: "pointer",
            color: "var(--color-text-muted)",
            flexShrink: 0,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <IconPlus size={hasMedia ? 18 : 14} />
          {!hasMedia && (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <IconPhoto size={14} />
              <span>Add photo / video</span>
              <IconVideo size={14} />
            </span>
          )}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        multiple
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

/* ── Success ────────────────────────────────────────────────── */

function SuccessScreen({ onAnother, queued }: { onAnother: () => void; queued?: boolean }) {
  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        background: "var(--color-bg-white)",
        textAlign: "center",
      }}
    >
      <IconCircleCheck
        size={64}
        color={queued ? "var(--color-warning)" : "var(--color-success)"}
        className="observe-success-icon"
        style={{ strokeWidth: 1.5, marginBottom: 20 }}
      />
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
        {queued ? "Saved for later" : "Signal submitted"}
      </h2>
      <p style={{ fontSize: 14, color: "var(--color-text-muted)", margin: "0 0 32px", maxWidth: 260 }}>
        {queued
          ? "No connection — your signal is queued and will be sent automatically when you\u2019re back online."
          : "Your observation is now visible to your team in CLEAR."}
      </p>
      <button
        onClick={onAnother}
        style={{
          padding: "12px 28px",
          background: "var(--color-accent)",
          color: "white",
          border: "none",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
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
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const locationsQuery = api.locations.list.useQuery(undefined, { staleTime: 1000 * 60 * 10 });
  const sourcesQuery = api.signals.sources.useQuery(undefined, { staleTime: 1000 * 60 * 10 });
  const createSignal = api.signals.create.useMutation();
  const utils = api.useUtils();

  // Keep a stable ref to the mutate fn so drainQueue never captures a stale closure
  const mutateFnRef = useRef(createSignal.mutateAsync);
  useEffect(() => { mutateFnRef.current = createSignal.mutateAsync; });

  const locationOptions = (locationsQuery.data ?? []).map((loc) => ({
    value: loc.id,
    label: loc.parent ? `${loc.name} (${loc.parent.name})` : loc.name,
  }));

  useEffect(() => {
    if (!sourcesQuery.data || form.sourceId) return;
    const sources = sourcesQuery.data;
    const preferred = sources.find((s) => /user|manual|field/i.test(s.name) || /user|manual|field/i.test(s.type));
    const gdacs = sources.find((s) => /gdacs/i.test(s.name));
    const auto = preferred ?? gdacs ?? sources[0];
    if (auto) setForm((p) => ({ ...p, sourceId: auto.id }));
  }, [sourcesQuery.data, form.sourceId]);

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
        break; // still offline, stop trying
      }
    }
  }, [utils]);

  // On mount: load pending count + drain if online; also listen for reconnect
  useEffect(() => {
    void dbGetPending().then((p) => setPendingCount(p.length));
    void drainQueue();
    window.addEventListener("online", drainQueue);
    return () => window.removeEventListener("online", drainQueue);
  }, [drainQueue]);

  const canSubmit = form.description.trim().length > 0 && form.sourceId.length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setError(null);
    setStep("submitting");

    const payload: QueuedPayload = {
      sourceId: form.sourceId,
      title: form.title.trim() || undefined,
      description: form.description.trim(),
      locationId: form.locationId || undefined,
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
      // Network error → queue for later
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
  }, [canSubmit, createSignal, form, utils]);

  function reset() {
    form.media.forEach((m) => URL.revokeObjectURL(m.preview));
    setForm(EMPTY_FORM);
    setError(null);
    setStep("form");
  }

  if (step === "success") return <SuccessScreen onAnother={reset} />;
  if (step === "queued") return <SuccessScreen onAnother={reset} queued />;

  const isSubmitting = step === "submitting";

  return (
    <div
      style={{
        height: "100dvh",
        background: "var(--color-bg-primary)",
        display: "flex",
        flexDirection: "column",
        maxWidth: 480,
        margin: "0 auto",
        overflow: "hidden",
      }}
    >
      {/* Accent top bar */}
      <div style={{ height: 3, background: "var(--color-accent)", flexShrink: 0 }} />

      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 20px",
          height: 52,
          background: "var(--color-bg-white)",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <Image src="/nrc-logo-square.svg" alt="NRC" width={30} height={30} />
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--color-text-primary)",
            letterSpacing: "-0.02em",
            fontFamily: "Calibri, 'Trebuchet MS', sans-serif",
          }}
        >
          CLEAR
        </span>
        <span style={{ color: "var(--color-border-dark)", fontSize: 16, margin: "0 2px" }}>|</span>
        <span style={{ fontSize: 14, fontWeight: 300, color: "var(--color-text-secondary)", letterSpacing: "0.01em" }}>
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

      {/* Scrollable form body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 0" }}>

        {/* Card */}
        <div
          style={{
            background: "var(--color-bg-white)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.04)",
            padding: "20px 20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Section label with accent bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 3, height: 16, background: "var(--color-accent)", flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)" }}>
              What did you observe?
            </p>
          </div>

          {/* Title */}
          <div>
            <label style={FIELD_LABEL}>Title</label>
            <input
              type="text"
              placeholder="Short headline…"
              value={form.title}
              onChange={(e) => { const v = e.currentTarget.value; setForm((p) => ({ ...p, title: v })); }}
              className="observe-input"
              style={INPUT}
            />
          </div>

          {/* Description */}
          <div>
            <label style={FIELD_LABEL}>
              Description <span style={{ color: "var(--color-accent)" }}>*</span>
            </label>
            <textarea
              placeholder="Describe what you saw — location, people affected, conditions…"
              value={form.description}
              onChange={(e) => { const v = e.currentTarget.value; setForm((p) => ({ ...p, description: v })); }}
              rows={4}
              className="observe-input"
              style={{ ...INPUT, resize: "none", lineHeight: 1.6 }}
            />
          </div>

          {/* Location */}
          <LocationField
            form={form}
            setForm={setForm}
            locationOptions={locationOptions}
            locationsLoading={locationsQuery.isLoading}
          />

          {/* Media */}
          <MediaField form={form} setForm={setForm} />
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              background: "var(--color-critical-light)",
              border: "1px solid #FECACA",
              color: "var(--color-critical)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ height: 80 }} />
      </div>

      {/* Fixed submit bar */}
      <div
        style={{
          padding: "12px 20px 20px",
          background: "var(--color-bg-white)",
          borderTop: "1px solid var(--color-border)",
          flexShrink: 0,
          display: "flex",
          gap: 8,
        }}
      >
        <button
          onClick={reset}
          disabled={isSubmitting}
          className="observe-btn-clear"
          style={{
            padding: "14px 18px",
            background: "none",
            border: "1px solid var(--color-border-dark)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-text-muted)",
            cursor: isSubmitting ? "default" : "pointer",
            flexShrink: 0,
            letterSpacing: "0.01em",
            transition: "background 150ms, color 150ms",
          }}
        >
          Clear
        </button>
        <button
          onClick={() => void handleSubmit()}
          disabled={!canSubmit || isSubmitting}
          className="observe-btn-submit"
          style={{
            flex: 1,
            padding: 14,
            background: canSubmit && !isSubmitting ? "var(--color-accent)" : "var(--color-border-dark)",
            color: "white",
            border: "none",
            fontSize: 14,
            fontWeight: 700,
            cursor: canSubmit && !isSubmitting ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "background 150ms, transform 100ms",
            letterSpacing: "0.01em",
          }}
        >
          {isSubmitting ? (
            <>
              <IconLoader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              Submitting…
            </>
          ) : (
            "Submit signal"
          )}
        </button>
      </div>
    </div>
  );
}
