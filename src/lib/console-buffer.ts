"use client";

/** Circular buffer of the last N console entries - used for bug reports. */

const MAX_ENTRIES = 50;
const buffer: string[] = [];
let patched = false;

export function initConsoleBuffer() {
  if (patched || typeof window === "undefined") return;
  patched = true;

  (["warn", "error"] as const).forEach((method) => {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      // Strip CSS styling args (used by styled console.log calls like tRPC devtools)
      const cleaned = args
        .filter((a) => {
          if (typeof a !== "string") return true;
          // Skip CSS style strings
          if (a.includes("background-color:") || a.includes("font-weight:") || a.includes("padding:")) return false;
          return true;
        })
        .map((a) => {
          if (typeof a === "string") return a.replace(/%c/g, "").trim();
          try { return typeof a === "object" ? JSON.stringify(a) : String(a); }
          catch { return String(a); }
        })
        .filter(Boolean);

      if (cleaned.length === 0) {
        original(...args);
        return;
      }

      const line = `[${method.toUpperCase()}] ${cleaned.join(" ")}`;
      buffer.push(line);
      if (buffer.length > MAX_ENTRIES) buffer.shift();
      original(...args);
    };
  });
}

export function getConsoleBuffer(): string[] {
  return [...buffer];
}
