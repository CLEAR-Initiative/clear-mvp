// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const FIND_URL = "https://find.test";
const SESSION_URL = "http://localhost:4000/api/auth/get-session";
const GRAPHQL_URL = "http://localhost:4000/graphql";
const FILE_ID = "e29e1fb446e29d6ed894ffc6c07fcd7f";

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;
let fetchMock: ReturnType<typeof vi.fn<Handler>>;
let role: string | undefined;
let agentOn: boolean;
let file: () => Response;

async function get(fileId: string, cookie: string | undefined = "better-auth.session_token=alice") {
  const { GET } = await import("./route");
  return GET(
    new Request(`http://localhost:3000/api/agent/source/${fileId}`, { headers: cookie ? { Cookie: cookie } : {} }),
    { params: Promise.resolve({ fileId }) },
  );
}

const findCalls = () => fetchMock.mock.calls.filter(([url]) => url.startsWith(FIND_URL));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NRC_FIND_API_URL", FIND_URL);
  vi.stubEnv("NRC_FIND_API_TOKEN", "find-secret");
  role = "viewer";
  agentOn = true;
  file = () =>
    new Response("docx-bytes", {
      headers: { "Content-Disposition": 'inline; filename=Sudan "EPP"/2023.docx', "Content-Type": "text/html" },
    });
  fetchMock = vi.fn<Handler>((url) => {
    if (url === SESSION_URL) {
      return role
        ? Response.json({ session: { id: "s1", userId: "u1", expiresAt: "2099-01-01T00:00:00Z" }, user: { id: "u1", role } })
        : Response.json(null);
    }
    if (url === GRAPHQL_URL) {
      return Response.json({ data: { featureFlags: [{ key: "agent", enabled: agentOn }] } });
    }
    if (url.startsWith(FIND_URL)) return file();
    throw new Error(`unexpected fetch ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/agent/source/[fileId]", () => {
  it("sends the document as an attachment, with NRC Find's credential kept server-side", async () => {
    const res = await get(FILE_ID);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("docx-bytes");
    // Never the upstream type: a document must not render on CLEAR's origin.
    expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Content-Disposition")).toBe(
      `attachment; filename="Sudan _EPP_2023.docx"; filename*=UTF-8''${encodeURIComponent('Sudan "EPP"2023.docx')}`,
    );
    const [url, init] = findCalls()[0]!;
    expect(url).toBe(`${FIND_URL}/api/v1/common/files/${FILE_ID}`);
    expect(new Headers(init?.headers).get("X-App-Authorization")).toBe("find-secret");
  });

  it.each([
    ["no session", () => (role = undefined), 401],
    ["a pending user", () => (role = "pending"), 403],
    ["the Agent turned off", () => (agentOn = false), 404],
  ])("refuses %s without calling NRC Find", async (_name, arrange, status) => {
    arrange();
    expect((await get(FILE_ID)).status).toBe(status);
    expect(findCalls()).toHaveLength(0);
  });

  it("refuses without a cookie", async () => {
    const { GET } = await import("./route");
    const res = await GET(new Request(`http://localhost:3000/api/agent/source/${FILE_ID}`), {
      params: Promise.resolve({ fileId: FILE_ID }),
    });
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["..%2F..%2Fadmin", "../metadata", "ABCDEF0123456789", "abc"])("refuses the id %s", async (id) => {
    expect((await get(id)).status).toBe(400);
    expect(findCalls()).toHaveLength(0);
  });

  it("says when NRC Find no longer has the document, or is down", async () => {
    file = () => new Response("nope", { status: 404 });
    expect((await get(FILE_ID)).status).toBe(404);
    file = () => new Response("boom", { status: 500 });
    expect((await get(FILE_ID)).status).toBe(502);
    file = () => {
      throw new TypeError("fetch failed");
    };
    expect((await get(FILE_ID)).status).toBe(502);
  });
});
