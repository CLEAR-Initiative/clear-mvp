import { describe, expect, it } from "vitest";
import { systemFirst } from "~/server/agent/system-first";

const user = (text: string) => ({ role: "user", content: [{ type: "text", text }] });

describe("systemFirst", () => {
  it("leaves a prompt with one leading system message untouched", () => {
    const prompt = [{ role: "system", content: "A" }, user("hi")];
    expect(systemFirst(prompt)).toEqual(prompt);
  });

  it("leaves a prompt with no system message untouched", () => {
    expect(systemFirst([user("hi")])).toEqual([user("hi")]);
  });

  it("joins later system messages into the first, in order, and keeps the rest in order", () => {
    const assistant = { role: "assistant", content: [{ type: "text", text: "yo" }] };
    expect(
      systemFirst([{ role: "system", content: "A" }, user("1"), assistant, { role: "system", content: "B" }, user("2")]),
    ).toEqual([{ role: "system", content: "A\n\nB" }, user("1"), assistant, user("2")]);
  });

  it("moves a system message that does not come first to the start", () => {
    expect(systemFirst([user("1"), { role: "system", content: "A" }])).toEqual([
      { role: "system", content: "A" },
      user("1"),
    ]);
  });

  it("drops empty system messages", () => {
    expect(systemFirst([{ role: "system", content: "A" }, user("1"), { role: "system", content: "  " }])).toEqual([
      { role: "system", content: "A" },
      user("1"),
    ]);
  });
});
