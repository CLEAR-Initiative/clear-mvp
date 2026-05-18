"use client";

/** Circular buffer of console.warn/error entries - attached to bug reports. */

const MAX_ENTRIES = 50;
const buffer: string[] = [];
let patched = false;

function patch() {
  if (patched || typeof window === "undefined") return;
  patched = true;

  (["warn", "error"] as const).forEach((method) => {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      const cleaned = args
        .filter((a) => {
          if (typeof a !== "string") return true;
          if (a.includes("background-color:") || a.includes("font-weight:") || a.includes("padding:")) return false;
          return true;
        })
        .map((a) => {
          if (typeof a === "string") return a.replace(/%c/g, "").trim();
          try { return typeof a === "object" ? JSON.stringify(a) : String(a); }
          catch { return String(a); }
        })
        .filter(Boolean);

      if (cleaned.length > 0) {
        const line = `[${method.toUpperCase()}] ${cleaned.join(" ")}`;
        buffer.push(line);
        if (buffer.length > MAX_ENTRIES) buffer.shift();
      }
      original(...args);
    };
  });
}

// Run at module load on the client - captures errors during hydration
// before useEffect fires
if (typeof window !== "undefined") patch();

export function initConsoleBuffer() { patch(); }
export function getConsoleBuffer(): string[] { return [...buffer]; }
