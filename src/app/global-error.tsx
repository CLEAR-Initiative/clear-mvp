"use client";

import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import {
  defaultLocale,
  LOCALE_COOKIE,
  localeDirection,
  pickLocale,
  type Locale,
} from "~/i18n/config";
import { isChunkLoadError, reloadOnceForChunkError } from "~/lib/chunk-load-error";
import { globalErrorCopy } from "./global-error-copy";

function browserLocale(): Locale {
  const cookie = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  return pickLocale(cookie, navigator.languages.join(","));
}

/**
 * Last-resort boundary for errors in the root layout. It replaces the whole
 * document, so there is no Mantine, no next-intl and maybe no global CSS:
 * plain elements, system colours (Canvas/CanvasText follow light and dark),
 * and copy from global-error-copy.ts.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const stale = isChunkLoadError(error);

  useEffect(() => {
    setLocale(browserLocale());
    Sentry.captureException(error, {
      tags: { boundary: "global", chunk_load: String(stale) },
    });
    reloadOnceForChunkError(error);
  }, [error, stale]);

  const copy = globalErrorCopy[locale];

  return (
    <html lang={locale} dir={localeDirection[locale]}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          boxSizing: "border-box",
          colorScheme: "light dark",
          background: "Canvas",
          color: "CanvasText",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main role="alert" style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>
            {stale ? copy.updatedTitle : copy.title}
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, margin: "0 0 20px", opacity: 0.75 }}>
            {stale ? copy.updatedMessage : copy.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ font: "inherit", fontSize: 14, padding: "8px 16px", cursor: "pointer" }}
          >
            {copy.reload}
          </button>
          {error.digest && (
            <p style={{ fontSize: 12, fontFamily: "monospace", marginTop: 16, opacity: 0.6 }}>
              {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
