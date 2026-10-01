import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../messages/en.json";
import type { UIMessage } from "ai";
import { AgentMessage, sourceDocumentsOf } from "~/components/agent/agent-message";

afterEach(() => cleanup());

function renderMessage(message: UIMessage) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <MantineProvider>
        <AgentMessage message={message} />
      </MantineProvider>
    </NextIntlClientProvider>,
  );
}

const answer = (parts: unknown[]): UIMessage =>
  ({ id: "a1", role: "assistant", parts }) as UIMessage;

const findCall = (state: string, output?: unknown) => ({
  type: "tool-nrc_find",
  toolCallId: "c1",
  state,
  input: { question: "What limits access in North Darfur?" },
  ...(output !== undefined ? { output } : {}),
});

const darfurDocs = {
  answer: "Restricted.",
  sourceDocuments: [
    { title: "Darfur access report", fileName: null, sourceId: "1", content: "Roads closed since June." },
    { title: "Darfur access report", fileName: null, sourceId: "1", content: "Roads closed since June." },
    { title: "Protection monitoring", fileName: "pm-2026", sourceId: "1", content: "Checkpoints increased." },
  ],
};

describe("AgentMessage", () => {
  it("shows a user turn as plain text", () => {
    renderMessage({ id: "u1", role: "user", parts: [{ type: "text", text: "**not bold**" }] });
    expect(screen.getByText("**not bold**")).toBeInTheDocument();
  });

  it("renders an Answer's text as Markdown, including GFM tables", () => {
    renderMessage(
      answer([
        {
          type: "text",
          text: "Access is **restricted**.\n\n| Region | Status |\n| --- | --- |\n| North Darfur | Closed |",
        },
      ]),
    );
    expect(screen.getByText("restricted").tagName).toBe("STRONG");
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Closed" })).toBeInTheDocument();
  });

  it("never renders raw HTML or script URLs from an Answer", () => {
    const { container } = renderMessage(
      answer([
        {
          type: "text",
          text: 'Hi <img src=x onerror="alert(1)"> <script>alert(2)</script> [click](javascript:alert(3)) [NRC](https://www.nrc.no)',
        },
      ]),
    );
    expect(container.querySelector("img, script")).toBeNull();
    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).not.toContain("javascript:alert(3)");
    const nrc = screen.getByRole("link", { name: "NRC" });
    expect(nrc).toHaveAttribute("target", "_blank");
    expect(nrc.getAttribute("rel")).toContain("noopener");
  });

  it("shows a running tool as a working… activity line", () => {
    renderMessage(answer([findCall("input-available")]));
    const line = screen.getByTestId("agent-tool-activity");
    expect(line).toHaveAttribute("data-tool", "nrc_find");
    expect(within(line).getByText("Searching NRC documents…")).toBeInTheDocument();
  });

  it("marks a finished tool done, and shows the Source documents under the Answer", () => {
    renderMessage(
      answer([
        findCall("output-available", darfurDocs),
        { type: "text", text: "Roads are closed [Darfur access report]." },
      ]),
    );
    expect(screen.getByText("Searched NRC documents")).toBeInTheDocument();
    const sources = screen.getByTestId("agent-sources");
    expect(within(sources).getByText("Sources (2)")).toBeInTheDocument();
    expect(within(sources).getByText("Darfur access report")).toBeInTheDocument();
    expect(within(sources).getByText("Protection monitoring")).toBeInTheDocument();
    expect(within(sources).getByText("pm-2026")).toBeInTheDocument();
    expect(within(sources).getByText("Roads closed since June.")).toBeInTheDocument();
  });

  it("shows a tool that failed as unavailable, with no sources", () => {
    renderMessage(
      answer([
        findCall("output-available", { error: "NRC Find is unreachable." }),
        { type: "text", text: "NRC Find is unavailable." },
      ]),
    );
    expect(screen.getByText("NRC documents unavailable")).toBeInTheDocument();
    expect(screen.queryByTestId("agent-sources")).toBeNull();
  });

  it("names an unknown tool generically", () => {
    renderMessage(answer([{ type: "tool-clear_count", toolCallId: "c2", state: "input-streaming" }]));
    expect(screen.getByText("Running clear_count…")).toBeInTheDocument();
  });
});

describe("sourceDocumentsOf", () => {
  it("only collects documents from finished tool results", () => {
    expect(sourceDocumentsOf([findCall("input-available")] as UIMessage["parts"])).toEqual([]);
    expect(
      sourceDocumentsOf([findCall("output-available", darfurDocs)] as UIMessage["parts"]).map(
        (d) => d.title,
      ),
    ).toEqual(["Darfur access report", "Protection monitoring"]);
  });
});
