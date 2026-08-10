import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  CAMPS_RESEARCH_MOCK,
  officialFixtureToSites,
  type CampsResearchSite,
  type OfficialCampsFixture,
} from "~/lib/research/camps-mock";

function researchCampsEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ENABLE_CAMPS_RESEARCH === "1"
  );
}

function fixturePath(): string {
  return (
    process.env.CAMPS_RESEARCH_FIXTURE_PATH ??
    path.join(process.cwd(), ".local", "camps-official.json")
  );
}

async function loadOfficialFixture(): Promise<CampsResearchSite[]> {
  try {
    const raw = await readFile(fixturePath(), "utf8");
    const parsed = JSON.parse(raw) as OfficialCampsFixture;
    if (!parsed?.sites?.length) return [];
    return officialFixtureToSites(parsed);
  } catch {
    return [];
  }
}

/**
 * Dev-only research feed for `/research/camps`.
 * Never enabled in production unless ENABLE_CAMPS_RESEARCH=1 (still keep fixtures out of git).
 * Note: `/api/*` bypasses auth middleware — do not put sensitive production data here;
 * official fixtures are local-dev smoke only.
 */
export async function GET() {
  if (!researchCampsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const official = await loadOfficialFixture();
  const sites: CampsResearchSite[] = [...official, ...CAMPS_RESEARCH_MOCK];

  return NextResponse.json({
    meta: {
      researchOnly: true,
      officialFixtureLoaded: official.length > 0,
      fixturePathHint: ".local/camps-official.json (gitignored)",
      warning:
        "Precise official coordinates must stay in .local/ — never commit them.",
    },
    sites,
  });
}
