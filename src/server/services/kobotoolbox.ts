import { env } from "~/env";

const DEFAULT_SERVER = "https://kf.kobotoolbox.org";
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT = 30_000;

function getConfig() {
  const token = env.KOBO_API_TOKEN;
  const serverUrl = env.KOBO_SERVER_URL ?? DEFAULT_SERVER;
  if (!token) {
    throw new Error("KOBO_API_TOKEN environment variable is not set.");
  }
  return { token, serverUrl };
}

async function koboFetch<T>(
  path: string,
  options: RequestInit = {},
  retries = MAX_RETRIES,
): Promise<T> {
  const { token, serverUrl } = getConfig();
  const url = `${serverUrl}${path}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeout);

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") ?? "5", 10);
        await sleep(retryAfter * 1000);
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`KoBo API ${res.status}: ${body}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }

  throw new Error("KoBo request failed after retries");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Types ─────────────────────────────────────────────────────────────

export interface KoboAsset {
  uid: string;
  name: string;
  asset_type: string;
  date_created: string;
  date_modified: string;
  deployment_status: string;
  deployment__active: boolean;
  deployment__submission_count: number;
  has_deployment: boolean;
  owner__username: string;
  url: string;
}

export interface KoboAssetList {
  count: number;
  next: string | null;
  previous: string | null;
  results: KoboAsset[];
}

export interface KoboSubmission {
  _id: number;
  _submission_time: string;
  _geolocation: [number | null, number | null];
  [key: string]: unknown;
}

export interface KoboSubmissionList {
  count: number;
  next: string | null;
  results: KoboSubmission[];
}

interface KoboDeployResponse {
  asset: { uid: string; name: string };
  active: boolean;
}

// ── Question type mapping (CLEAR → KoBo XLSForm) ─────────────────────

const QUESTION_TYPE_MAP: Record<string, string> = {
  TEXT: "text",
  TEXTAREA: "text",
  NUMBER: "integer",
  DATE: "date",
  SINGLE_CHOICE: "select_one",
  MULTIPLE_CHOICE: "select_multiple",
  SCALE: "range",
  LOCATION: "geopoint",
  BOOLEAN: "acknowledge",
};

// ── Public API ────────────────────────────────────────────────────────

/** Validate connection by fetching the user profile */
export async function validateConnection(): Promise<{
  connected: boolean;
  username?: string;
  serverUrl: string;
}> {
  const { serverUrl } = getConfig();
  try {
    const data = await koboFetch<{ username: string }>("/me/");
    return { connected: true, username: data.username, serverUrl };
  } catch {
    return { connected: false, serverUrl };
  }
}

/** List KoBo assets (surveys/forms) */
export async function listAssets(
  limit = 50,
  offset = 0,
): Promise<KoboAssetList> {
  return koboFetch<KoboAssetList>(
    `/api/v2/assets/?format=json&asset_type=survey&limit=${limit}&offset=${offset}`,
  );
}

/** Get a single KoBo asset by UID */
export async function getAsset(uid: string): Promise<KoboAsset> {
  return koboFetch<KoboAsset>(`/api/v2/assets/${uid}/?format=json`);
}

/**
 * Export a CLEAR survey template as a KoBo-compatible asset.
 * Creates the form on KoBo with the survey questions.
 */
export async function exportSurvey(survey: {
  title: string;
  questions: {
    questionNumber: number;
    questionText: string;
    questionType: string;
    isRequired: boolean;
    options: unknown; // JSON string[] or null
  }[];
}): Promise<{ uid: string; name: string; url: string }> {
  // Build XLSForm-style survey content for KoBo
  const surveyContent = buildKoboContent(survey);

  const result = await koboFetch<{ uid: string; name: string; url: string }>(
    "/api/v2/assets/?format=json",
    {
      method: "POST",
      body: JSON.stringify({
        name: survey.title,
        asset_type: "survey",
        content: surveyContent,
      }),
    },
  );

  return result;
}

/** Deploy a KoBo asset (make it available for data collection) */
export async function deployAsset(
  uid: string,
): Promise<KoboDeployResponse> {
  return koboFetch<KoboDeployResponse>(
    `/api/v2/assets/${uid}/deployment/`,
    { method: "POST", body: JSON.stringify({ active: true }) },
  );
}

/** Fetch submissions for a KoBo asset */
export async function getSubmissions(
  uid: string,
  options?: { limit?: number; start?: number; sinceDate?: string },
): Promise<KoboSubmissionList> {
  const params = new URLSearchParams({ format: "json" });
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.start) params.set("start", String(options.start));
  if (options?.sinceDate) {
    params.set("query", JSON.stringify({ _submission_time: { $gte: options.sinceDate } }));
  }

  return koboFetch<KoboSubmissionList>(
    `/api/v2/assets/${uid}/data/?${params.toString()}`,
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

interface KoboContent {
  survey: Record<string, string>[];
  choices: Record<string, string>[];
  settings: Record<string, string>;
}

function buildKoboContent(survey: {
  title: string;
  questions: {
    questionNumber: number;
    questionText: string;
    questionType: string;
    isRequired: boolean;
    options: unknown;
  }[];
}): KoboContent {
  const surveyRows: Record<string, string>[] = [];
  const choiceRows: Record<string, string>[] = [];

  for (const q of survey.questions) {
    const koboType = QUESTION_TYPE_MAP[q.questionType] ?? "text";
    const name = `q${q.questionNumber}`;

    // For choice-type questions, create a choice list
    let type = koboType;
    if (
      (koboType === "select_one" || koboType === "select_multiple") &&
      Array.isArray(q.options)
    ) {
      const listName = `${name}_choices`;
      type = `${koboType} ${listName}`;

      for (const opt of q.options as string[]) {
        choiceRows.push({
          list_name: listName,
          name: opt.toLowerCase().replace(/\s+/g, "_"),
          label: opt,
        });
      }
    }

    surveyRows.push({
      type,
      name,
      label: q.questionText,
      required: q.isRequired ? "yes" : "no",
    });
  }

  return {
    survey: surveyRows,
    choices: choiceRows,
    settings: { form_title: survey.title },
  };
}
