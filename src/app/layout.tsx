import "~/styles/globals.css";

import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { Inter, Noto_Sans_Arabic } from "next/font/google";
import {
  MantineProvider,
  ColorSchemeScript,
  DirectionProvider,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

import { TRPCReactProvider } from "~/trpc/react";
import { clearTheme } from "~/app/config/themes";
import { localeDirection, isLocale, defaultLocale } from "~/i18n/config";
import { isMapPath } from "~/lib/is-map-path";
import {
  NAV_COLLAPSED_COOKIE,
  parseNavCollapsedCookie,
} from "~/lib/nav-collapsed-cookie";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("title"),
    description: t("description"),
    manifest: "/manifest.webmanifest",
    icons: {
      apple: "/apple-touch-icon.png",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "CLEAR Observe",
    },
  };
}

// Lock page/layout scale on all devices so pinch-zoom can't blow up the shell
// (map canvas still handles its own gestures via Mapbox). Also resets a stuck
// browser zoom on refresh so the bottom nav stays on-screen.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const messages = await getMessages();
  const dir = localeDirection[locale];
  // Middleware forwards x-pathname so /map SSR can paint chrome at the final
  // left offset (client-only data-nav-overlay caused a horizontal slide #571).
  // Do NOT pin --clear-nav-w as an inline style — that froze collapse/expand.
  // Cookie + data-nav-collapsed seeds the CSS default until NavSidebar owns
  // documentElement --clear-nav-w.
  const pathname = (await headers()).get("x-pathname") ?? "";
  const mapNavOverlay = isMapPath(pathname);
  const navCollapsed = parseNavCollapsedCookie(
    (await cookies()).get(NAV_COLLAPSED_COOKIE)?.value,
  );

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
        {/* Critical CSS: Prevent white flash before external CSS loads */}
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            background: #FAFAFA;
            margin: 0;
            padding: 0;
          }
          body[data-nav-collapsed="true"] {
            --clear-nav-w: 80px;
          }
          @media (prefers-color-scheme: dark) {
            html, body {
              background: #111111;
            }
          }
          [data-mantine-color-scheme="dark"] html,
          [data-mantine-color-scheme="dark"] body {
            background: #111111;
          }
        `}} />
      </head>
      <body
        className={`${inter.variable} ${notoSansArabic.variable} font-sans antialiased`}
        data-nav-overlay={mapNavOverlay ? "true" : undefined}
        data-nav-collapsed={navCollapsed ? "true" : undefined}
        suppressHydrationWarning
      >
        <DirectionProvider initialDirection={dir} detectDirection={false}>
          <MantineProvider theme={clearTheme} defaultColorScheme="auto">
            <NextIntlClientProvider locale={locale} messages={messages}>
              <Notifications position="top-right" />
              <TRPCReactProvider>{children}</TRPCReactProvider>
            </NextIntlClientProvider>
          </MantineProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}
