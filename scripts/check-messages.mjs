#!/usr/bin/env node
/**
 * Guards the translation catalogs:
 *  1. Every locale file must have exactly the same key set as en.json.
 *  2. Every message must be valid ICU syntax (catches corrupted
 *     plural/interpolation blocks before they throw at runtime).
 *
 * Run via `npm run i18n:check` (part of `npm run check`).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const messagesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "messages");

// next-intl ships intl-messageformat transitively (via use-intl). Fall back
// to a brace-balance check if module resolution ever changes.
let parseIcu;
try {
  const { IntlMessageFormat } = await import("intl-messageformat");
  parseIcu = (msg, locale) => void new IntlMessageFormat(msg, locale);
} catch {
  parseIcu = (msg) => {
    let depth = 0;
    for (const ch of msg) {
      if (ch === "{") depth++;
      if (ch === "}") depth--;
      if (depth < 0) throw new Error("Unbalanced braces");
    }
    if (depth !== 0) throw new Error("Unbalanced braces");
  };
}

function flattenKeys(obj, prefix = "") {
  const keys = new Map();
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") {
      for (const [k, v] of flattenKeys(value, path)) keys.set(k, v);
    } else {
      keys.set(path, String(value));
    }
  }
  return keys;
}

const locales = readdirSync(messagesDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""));

if (!locales.includes("en")) {
  console.error("check-messages: messages/en.json not found");
  process.exit(1);
}

const catalogs = new Map(
  locales.map((locale) => [
    locale,
    flattenKeys(JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), "utf8"))),
  ]),
);

const enKeys = catalogs.get("en");
let failed = false;

for (const [locale, keys] of catalogs) {
  if (locale !== "en") {
    const missing = [...enKeys.keys()].filter((k) => !keys.has(k));
    const extra = [...keys.keys()].filter((k) => !enKeys.has(k));
    if (missing.length) {
      failed = true;
      console.error(`messages/${locale}.json is missing keys:\n  ${missing.join("\n  ")}`);
    }
    if (extra.length) {
      failed = true;
      console.error(`messages/${locale}.json has keys not in en.json:\n  ${extra.join("\n  ")}`);
    }
  }

  for (const [key, message] of keys) {
    try {
      parseIcu(message, locale);
    } catch (err) {
      failed = true;
      console.error(`messages/${locale}.json: invalid ICU in "${key}": ${err.message}`);
    }
  }
}

if (failed) process.exit(1);
console.log(`check-messages: ${locales.length} locales, ${enKeys.size} keys, all in sync`);
