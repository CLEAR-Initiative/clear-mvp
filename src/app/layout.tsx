import "~/styles/globals.css";

import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: true,
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
      <body className={`${inter.variable} ${notoSansArabic.variable} font-sans antialiased`}>
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
