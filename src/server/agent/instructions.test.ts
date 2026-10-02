import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AGENT_LINK_GUIDE } from "~/lib/agent-links";
import { clearAgentInstructions } from "~/server/agent/instructions";

describe("clearAgentInstructions", () => {
  it("teaches the link structure only when the Agent has CLEAR data to link to", () => {
    expect(clearAgentInstructions("en", { clearData: { contentRule: "Rule." } })).toContain(AGENT_LINK_GUIDE);
    expect(clearAgentInstructions("en")).not.toContain("/event/<id>");
  });

  it("keeps NRC Find for background once CLEAR is read live", () => {
    const withClear = clearAgentInstructions("en", { clearData: { contentRule: "Rule." } });
    expect(withClear).toContain("Don't use it for what is happening now");
    expect(clearAgentInstructions("en")).toContain("anything NRC's documents might cover");
  });
});
