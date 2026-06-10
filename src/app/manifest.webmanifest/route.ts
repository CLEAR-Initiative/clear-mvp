import { cookies } from "next/headers";

import { defaultLocale, isLocale, LOCALE_COOKIE } from "~/i18n/config";

import type enMessages from "../../../messages/en.json";

/**
 * Localized PWA manifest. Serves the static manifest fields with
 * name/short_name/description resolved from the active locale's message
 * catalog (NEXT_LOCALE cookie, falling back to "en"), so the installed
 * app metadata follows the user's language choice.
 */
export async function GET() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  const messages = (
    (await import(`../../../messages/${locale}.json`)) as {
      default: typeof enMessages;
    }
  ).default;

  const manifest = {
    name: messages.manifest.name,
    short_name: messages.manifest.shortName,
    description: messages.manifest.description,
    start_url: "/observe",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#E85D3D",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
