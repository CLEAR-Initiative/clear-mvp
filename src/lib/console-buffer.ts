"use client";

/** Circular buffer of the last N console entries - used for bug reports. */

const MAX_ENTRIES = 50;
const buffer: string[] = [];
let patched = false;

export function initConsoleBuffer() {
  if (patched || typeof window === "undefined") return;
  patched = true;

  (["log", "warn", "error"] as const).forEach((method) => {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      const line = `[${method.toUpperCase()}] ${args
        .map((a) => {
          try { return typeof a === "object" ? JSON.stringify(a) : String(a); }
          catch { return String(a); }
        })
        .join(" ")}`;
      buffer.push(line);
      if (buffer.length > MAX_ENTRIES) buffer.shift();
      original(...args);
    };
  });
}

export function getConsoleBuffer(): string[] {
  return [...buffer];
}
