import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("observe.metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function ObserveLayout({ children }: { children: React.ReactNode }) {
  return <div data-mantine-color-scheme="dark">{children}</div>;
}
