/**
 * One system message, first.
 *
 * Mastra sends the Agent's instructions as a system message, then adds more
 * system messages later in the prompt (working memory, the Current view).
 * Hosted providers accept that. Open-weight chat templates often do not:
 * Qwen's raises "System message must be at the beginning" and llama.cpp
 * answers 500. So for a self-hosted endpoint every system message is joined,
 * in order, into one at the start; nothing else in the prompt moves.
 */

interface PromptMessage {
  role: string;
  content: unknown;
}

export function systemFirst<T extends PromptMessage>(prompt: readonly T[]): T[] {
  const system = prompt.filter((m) => m.role === "system");
  if (system.length === 0) return [...prompt];
  if (system.length === 1 && prompt[0]?.role === "system") return [...prompt];
  const text = system
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .filter((t) => t.trim() !== "")
    .join("\n\n");
  const rest = prompt.filter((m) => m.role !== "system");
  return [{ ...system[0]!, content: text }, ...rest];
}
