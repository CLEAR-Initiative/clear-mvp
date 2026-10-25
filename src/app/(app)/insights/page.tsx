import { redirect } from "next/navigation";

/** The Insights page is retired. Analysis is the section, at /analysis. */
export default function InsightsPage() {
  redirect("/analysis");
}
