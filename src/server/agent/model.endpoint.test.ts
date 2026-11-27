// @vitest-environment node
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Agent } from "@mastra/core/agent";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveClearAgentModel } from "~/server/agent/model";

vi.mock("server-only", () => ({}));

/**
 * The configured endpoint, driven through Mastra for real: a fake
 * OpenAI-compatible server records what the Agent's model actually sends.
 */
interface Seen {
  url?: string;
  authorization?: string;
  model?: unknown;
}

let server: Server;
let seen: Seen;
let baseUrl: string;

const body = (req: IncomingMessage) =>
  new Promise<string>((resolve) => {
    let data = "";
    req.on("data", (c: Buffer) => (data += c.toString()));
    req.on("end", () => resolve(data));
  });

beforeEach(async () => {
  seen = {};
  server = createServer((req, res) => {
    void body(req).then((raw) => {
      seen.url = req.url;
      seen.authorization = req.headers.authorization;
      seen.model = (JSON.parse(raw) as { model?: unknown }).model;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: "chatcmpl-1",
          object: "chat.completion",
          created: 0,
          model: "qwen3.5-9b",
          choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: "ready" } }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/llm/v1`;
  vi.stubEnv("CLEAR_AGENT_MODEL", "nrc-find/qwen3.5-9b");
  vi.stubEnv("CLEAR_AGENT_MODEL_URL", baseUrl);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await new Promise((resolve) => server.close(resolve));
});

async function ask() {
  const agent = new Agent({ id: "t", name: "t", instructions: "Answer.", model: resolveClearAgentModel() });
  return agent.generate("Say ready.");
}

describe("CLEAR Agent on an OpenAI-compatible endpoint", () => {
  it("posts chat completions to the configured URL with the model name and key", async () => {
    vi.stubEnv("CLEAR_AGENT_MODEL_API_KEY", "llm-key");
    const result = await ask();
    expect(result.text).toBe("ready");
    expect(seen.url).toBe("/llm/v1/chat/completions");
    expect(seen.model).toBe("qwen3.5-9b");
    expect(seen.authorization).toBe("Bearer llm-key");
  });

  it("sends no real key when none is configured", async () => {
    vi.stubEnv("CLEAR_AGENT_MODEL_API_KEY", "");
    await ask();
    expect(seen.url).toBe("/llm/v1/chat/completions");
    expect(seen.authorization).toBeUndefined();
  });
});
