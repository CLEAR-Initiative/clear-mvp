/**
 * The CLEAR Agent's chat endpoint (ADR-0005, ADR-0006).
 *
 * Streams one turn of a Thread as an AI SDK UI message stream. Only the
 * newest user message is sent: the Agent's memory loads the earlier turns
 * from the Conversation in clear-api.
 *
 * Callers must hold an approved CLEAR session. Middleware skips `/api/*`, so
 * this handler checks the session itself; the role rule mirrors clear-api
 * `requireContentReader` (`pending` users get 403). Everything the Agent
 * reads or stores goes to clear-api with this request's Cookie, so clear-api
 * enforces who owns which Thread.
 */

import { handleChatStream } from "@mastra/ai-sdk";
import { createUIMessageStreamResponse } from "ai";
import { z } from "zod";
import { canReadContent } from "~/lib/roles";
import { CLEAR_AGENT_ID, createClearAgent } from "~/server/agent/create-clear-agent";
import { getSessionUser } from "~/server/session";

const bodySchema = z.object({
  /** The client's id for the Thread; the Conversation id in clear-api. */
  threadId: z.string().min(1).max(128),
  /** The newest user message, as `useChat` sends it. Only its text is used. */
  message: z.object({
    id: z.string().min(1).max(128),
    parts: z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()),
  }),
});

/** Long enough for any real question; stops a pasted document. */
const MAX_MESSAGE_CHARS = 8_000;

export async function POST(req: Request): Promise<Response> {
  const cookie = req.headers.get("cookie");
  const session = await getSessionUser(cookie);
  if (session.status === "unavailable") {
    return Response.json({ error: "Auth service unavailable." }, { status: 503 });
  }
  if (session.status === "unauthenticated" || !cookie) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!canReadContent(session.user.role)) {
    return Response.json(
      { error: "Your account is awaiting admin approval." },
      { status: 403 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "A `threadId` and a `message` are required." }, { status: 400 });
  }
  const { threadId, message } = parsed.data;
  // Rebuild the message from its text alone: whatever else the client sent
  // (roles, tool results, files) never reaches the model.
  const text = message.parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("\n")
    .trim();
  if (!text) {
    return Response.json({ error: "The message has no text." }, { status: 400 });
  }
  if (text.length > MAX_MESSAGE_CHARS) {
    return Response.json({ error: "The message is too long." }, { status: 413 });
  }

  const mastra = createClearAgent({ user: session.user, cookie });
  let stream: Awaited<ReturnType<typeof handleChatStream>>;
  try {
    stream = await handleChatStream({
      mastra,
      agentId: CLEAR_AGENT_ID,
      version: "v7",
      params: {
        messages: [{ id: message.id, role: "user", parts: [{ type: "text", text }] }],
        // The resource is always the session user, never anything from the body.
        memory: { thread: threadId, resource: session.user.id },
      },
    });
  } catch (err) {
    // Loading the Thread runs before the stream opens; clear-api refuses
    // another user's Conversation.
    if (clearApiCode(err) === "FORBIDDEN") {
      return Response.json({ error: "This Thread belongs to another user." }, { status: 403 });
    }
    console.error("[agent] could not start a turn:", err);
    return Response.json({ error: "The CLEAR Agent could not start." }, { status: 502 });
  }
  return createUIMessageStreamResponse({ stream });
}

/**
 * The clear-api error code behind `err`, however deeply Mastra wrapped it.
 * Matched by shape: Mastra re-creates causes, so `instanceof` doesn't hold.
 */
function clearApiCode(err: unknown): string | undefined {
  for (let e: unknown = err, depth = 0; e && depth < 5; e = (e as Error).cause, depth++) {
    const { name, code } = e as { name?: unknown; code?: unknown };
    if (name === "GraphQLRequestError" && typeof code === "string") return code;
  }
  return undefined;
}
