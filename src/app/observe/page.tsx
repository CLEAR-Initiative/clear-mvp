"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { IconMapPin, IconCamera, IconX, IconCheck, IconChevronRight, IconLoader2 } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";

/* ── Types ─────────────────────────────────────────────────── */

type Step = "form" | "submitting" | "success";

interface FormState {
  description: string;
  title: string;
  sourceId: string;
  locationId: string;
  locationLabel: string;
  lat: number | null;
  lng: number | null;
  photo: File | null;
  photoPreview: string | null;
}

const EMPTY_FORM: FormState = {
  description: "",
  title: "",
  sourceId: "",
  locationId: "",
  locationLabel: "",
  lat: null,
  lng: null,
  photo: null,
  photoPreview: null,
};

/* ── Helpers ────────────────────────────────────────────────── */

function formatCoords(lat: number, lng: number) {
  return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
}

/* ── Sub-components ─────────────────────────────────────────── */

function Header() {
  return (
    <div style={{ padding: "20px 24px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div
          style={{
            width: 28,
            height: 28,
            background: "var(--color-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ color: "white", fontSize: 13, fontWeight: 800, letterSpacing: "-0.5px" }}>C</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "0.04em" }}>
          CLEAR
        </span>
      </div>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--color-text-primary)",
          margin: "12px 0 4px",
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
        }}
      >
        Observe
      </h1>
      <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
        Submit a field signal to your team
      </p>
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "var(--color-text-muted)",
        marginBottom: 8,
      }}
    >
      {children}
      {required && <span style={{ color: "var(--color-accent)", marginLeft: 3 }}>*</span>}
    </label>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--color-border)", margin: "4px 0" }} />;
}

/* ── Location picker ────────────────────────────────────────── */

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
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState("");

  function captureGPS() {
    if (!navigator.geolocation) {
      setGpsError("Geolocation not supported on this device");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
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
      },
      () => {
        setGpsLoading(false);
        setGpsError("Unable to get location. Please allow access or search manually.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function clearLocation() {
    setForm((p) => ({ ...p, lat: null, lng: null, locationId: "", locationLabel: "" }));
    setShowSearch(false);
    setSearch("");
  }

  const filtered = locationOptions.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  const hasLocation = form.lat !== null || form.locationId;

  return (
    <div>
      <FieldLabel>Location</FieldLabel>

      {hasLocation ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            background: "var(--color-success-light)",
            border: "1px solid #6EE7B7",
          }}
        >
          <IconMapPin size={16} color="var(--color-success)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 14, color: "#065F46", fontWeight: 500 }}>
            {form.locationLabel}
          </span>
          <button
            onClick={clearLocation}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#065F46" }}
          >
            <IconX size={14} />
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={captureGPS}
            disabled={gpsLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 16px",
              background: "var(--color-bg-muted)",
              border: "1px solid var(--color-border)",
              cursor: gpsLoading ? "default" : "pointer",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--color-text-primary)",
              width: "100%",
              textAlign: "left",
            }}
          >
            {gpsLoading ? (
              <IconLoader2 size={16} color="var(--color-accent)" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
            ) : (
              <IconMapPin size={16} color="var(--color-accent)" style={{ flexShrink: 0 }} />
            )}
            {gpsLoading ? "Getting your location…" : "Use my current location"}
          </button>

          <button
            onClick={() => setShowSearch((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: "none",
              border: "1px solid var(--color-border)",
              cursor: "pointer",
              fontSize: 13,
              color: "var(--color-text-muted)",
              width: "100%",
              textAlign: "left",
            }}
          >
            Search by name
            <IconChevronRight size={14} style={{ transform: showSearch ? "rotate(90deg)" : "none", transition: "transform 150ms" }} />
          </button>

          {showSearch && (
            <div>
              <input
                type="text"
                placeholder={locationsLoading ? "Loading locations…" : "Search locations…"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1px solid var(--color-border-dark)",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  color: "var(--color-text-primary)",
                  background: "white",
                }}
              />
              {search.length > 0 && (
                <div
                  style={{
                    border: "1px solid var(--color-border)",
                    borderTop: "none",
                    maxHeight: 200,
                    overflowY: "auto",
                    background: "white",
                  }}
                >
                  {filtered.length === 0 ? (
                    <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--color-text-muted)" }}>
                      No locations found
                    </div>
                  ) : (
                    filtered.slice(0, 8).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setForm((p) => ({ ...p, locationId: opt.value, locationLabel: opt.label, lat: null, lng: null }));
                          setShowSearch(false);
                          setSearch("");
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "11px 14px",
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
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {gpsError && (
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--color-critical)" }}>{gpsError}</p>
      )}
    </div>
  );
}

/* ── Photo capture ──────────────────────────────────────────── */

function PhotoField({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const url = URL.createObjectURL(file);
    setForm((p) => ({ ...p, photo: file, photoPreview: url }));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function clear() {
    if (form.photoPreview) URL.revokeObjectURL(form.photoPreview);
    setForm((p) => ({ ...p, photo: null, photoPreview: null }));
  }

  return (
    <div>
      <FieldLabel>Photo</FieldLabel>

      {form.photoPreview ? (
        <div style={{ position: "relative", display: "inline-block" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={form.photoPreview}
            alt="Preview"
            style={{
              width: "100%",
              maxHeight: 220,
              objectFit: "cover",
              display: "block",
              border: "1px solid var(--color-border)",
            }}
          />
          <button
            onClick={clear}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "rgba(0,0,0,0.6)",
              border: "none",
              borderRadius: "50%",
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "white",
            }}
          >
            <IconX size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            padding: "32px 16px",
            border: "1.5px dashed var(--color-border-dark)",
            background: "var(--color-bg-muted)",
            cursor: "pointer",
          }}
        >
          <IconCamera size={24} color="var(--color-text-muted)" />
          <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
            Take photo or upload
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleChange}
      />
    </div>
  );
}

/* ── Success screen ─────────────────────────────────────────── */

function SuccessScreen({ onAnother }: { onAnother: () => void }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        background: "white",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          background: "var(--color-success-light)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <IconCheck size={32} color="var(--color-success)" strokeWidth={2.5} />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
        Signal submitted
      </h2>
      <p style={{ fontSize: 14, color: "var(--color-text-muted)", margin: "0 0 32px", maxWidth: 260 }}>
        Your observation has been sent to your team and is now visible in CLEAR.
      </p>
      <button
        onClick={onAnother}
        style={{
          padding: "14px 28px",
          background: "var(--color-accent)",
          color: "white",
          border: "none",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: "0.01em",
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

  const { activeTeamId } = useTeam();
  const locationsQuery = api.locations.list.useQuery(undefined, { staleTime: 1000 * 60 * 10 });
  const sourcesQuery = api.signals.sources.useQuery(undefined, { staleTime: 1000 * 60 * 10 });
  const createSignal = api.signals.create.useMutation();
  const utils = api.useUtils();

  const locationOptions = (locationsQuery.data ?? []).map((loc) => ({
    value: loc.id,
    label: loc.parent ? `${loc.name} (${loc.parent.name})` : loc.name,
  }));

  // Auto-select source
  useEffect(() => {
    if (!sourcesQuery.data || form.sourceId) return;
    const sources = sourcesQuery.data;
    const preferred = sources.find((s) => /user|manual|field/i.test(s.name) || /user|manual|field/i.test(s.type));
    const gdacs = sources.find((s) => /gdacs/i.test(s.name));
    const auto = preferred ?? gdacs ?? sources[0];
    if (auto) setForm((p) => ({ ...p, sourceId: auto.id }));
  }, [sourcesQuery.data, form.sourceId]);

  const canSubmit = form.description.trim().length > 0 && form.sourceId.length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setError(null);
    setStep("submitting");
    try {
      await createSignal.mutateAsync({
        sourceId: form.sourceId,
        title: form.title.trim() || undefined,
        description: form.description.trim(),
        locationId: form.locationId || undefined,
      });
      void utils.signals.list.invalidate({ teamId: activeTeamId ?? undefined });
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
      setStep("form");
    }
  }, [canSubmit, createSignal, form, utils, activeTeamId]);

  function reset() {
    setForm(EMPTY_FORM);
    setError(null);
    setStep("form");
  }

  if (step === "success") return <SuccessScreen onAnother={reset} />;

  const isSubmitting = step === "submitting";

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "white",
        display: "flex",
        flexDirection: "column",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      {/* Accent bar */}
      <div style={{ height: 3, background: "var(--color-accent)", flexShrink: 0 }} />

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 100 }}>
        <Header />

        <div style={{ padding: "24px 24px 0", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Description — primary field */}
          <div>
            <FieldLabel required>What did you observe?</FieldLabel>
            <textarea
              placeholder="Describe what you saw — location, people affected, conditions, anything relevant…"
              value={form.description}
              onChange={(e) => { const v = e.currentTarget.value; setForm((p) => ({ ...p, description: v })); }}
              rows={5}
              autoFocus
              style={{
                width: "100%",
                padding: "14px",
                border: "1px solid var(--color-border-dark)",
                fontSize: 15,
                lineHeight: 1.5,
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
                color: "var(--color-text-primary)",
                boxSizing: "border-box",
                background: "white",
              }}
            />
          </div>

          <Divider />

          {/* Location */}
          <LocationField
            form={form}
            setForm={setForm}
            locationOptions={locationOptions}
            locationsLoading={locationsQuery.isLoading}
          />

          <Divider />

          {/* Photo */}
          <PhotoField form={form} setForm={setForm} />

          <Divider />

          {/* Optional title */}
          <div>
            <FieldLabel>Title <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 11 }}>(optional)</span></FieldLabel>
            <input
              type="text"
              placeholder="Short headline, e.g. Flooding in Kassala market area"
              value={form.title}
              onChange={(e) => { const v = e.currentTarget.value; setForm((p) => ({ ...p, title: v })); }}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid var(--color-border)",
                fontSize: 14,
                outline: "none",
                fontFamily: "inherit",
                color: "var(--color-text-primary)",
                boxSizing: "border-box",
                background: "white",
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: "12px 14px",
                background: "var(--color-critical-light)",
                border: "1px solid #FECACA",
                color: "var(--color-critical)",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Sticky submit */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 480,
          padding: "12px 24px 24px",
          background: "white",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <button
          onClick={() => void handleSubmit()}
          disabled={!canSubmit || isSubmitting}
          style={{
            width: "100%",
            padding: "16px",
            background: canSubmit && !isSubmitting ? "var(--color-accent)" : "var(--color-border-dark)",
            color: "white",
            border: "none",
            fontSize: 15,
            fontWeight: 700,
            cursor: canSubmit && !isSubmitting ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            letterSpacing: "0.01em",
            transition: "background 150ms",
          }}
        >
          {isSubmitting ? (
            <>
              <IconLoader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
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
