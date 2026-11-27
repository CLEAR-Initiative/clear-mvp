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
  roles?: string[];
  system?: unknown;
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
      const sent = JSON.parse(raw) as { model?: unknown; messages?: Array<{ role: string; content: unknown }> };
      seen.model = sent.model;
      seen.roles = sent.messages?.map((m) => m.role);
      seen.system = sent.messages?.find((m) => m.role === "system")?.content;
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

  it("joins every system message into one at the start of the prompt", async () => {
    // Qwen's chat template rejects a system message after the first turn,
    // and Mastra appends some (working memory, the Current view).
    const model = resolveClearAgentModel() as unknown as {
      doGenerate: (options: unknown) => Promise<unknown>;
    };
    await model.doGenerate({
      prompt: [
        { role: "system", content: "Instructions." },
        { role: "user", content: [{ type: "text", text: "Hi" }] },
        { role: "system", content: "Working memory." },
      ],
    });
    expect(seen.roles).toEqual(["system", "user"]);
    expect(seen.system).toBe("Instructions.\n\nWorking memory.");
  });
});
