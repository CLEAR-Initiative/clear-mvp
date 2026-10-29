import { redirect } from "next/navigation";

type Search = Record<string, string | string[] | undefined>;

/**
 * Old address for Insights. The page lives at /insights. A link that still
 * names the opened record `analysis=` or `automation=` is rewritten to `insights=`.
 */
export default async function AnalysisPage({ searchParams }: { searchParams: Promise<Search> }) {
  const incoming = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value === "string") params.append(key, value);
    else if (Array.isArray(value)) for (const item of value) params.append(key, item);
  }
  const legacy = params.get("insights") ? null : (params.get("analysis") ?? params.get("automation"));
  if (legacy) {
    params.delete("analysis");
    params.delete("automation");
    params.set("insights", legacy);
  }
  const qs = params.toString();
  redirect(qs ? `/insights?${qs}` : "/insights");
}
