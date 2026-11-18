import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { readFeatureFlag } from "~/server/feature-flags";

export default async function MapV2Layout({ children }: { children: React.ReactNode }) {
  const cookie = (await headers()).get("cookie");
  const enabled = await readFeatureFlag("map_v2", cookie ? { Cookie: cookie } : {});
  if (!enabled) notFound();

  return <NuqsAdapter>{children}</NuqsAdapter>;
}
