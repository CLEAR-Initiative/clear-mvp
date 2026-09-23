import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { InboxEntry } from "~/lib/hotline-inbox";
import { EntryList } from "./entry-list";
import { ReadingPane } from "./reading-pane";
import { AddToClearModal } from "./add-to-clear-modal";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  useFormatter: () => ({
    dateTime: () => "15 Sep 2026",
    relativeTime: () => "1 month ago",
  }),
  useLocale: () => "en",
}));

const requestTranslation = vi.fn();
vi.mock("~/trpc/react", () => ({
  api: {
    ground: {
      requestTranslation: { useMutation: () => ({ mutate: requestTranslation, data: undefined, isError: false }) },
      translation: { useQuery: () => ({ data: undefined }) },
    },
    locations: {
      list: {
        useQuery: () => ({
          isLoading: false,
          data: [
            { id: "sdn", name: "Sudan", level: 0, parent: null },
            { id: "kas", name: "Kassala", level: 1, parent: { id: "sdn", name: "Sudan" } },
            { id: "deep", name: "Village", level: 3, parent: { id: "kas", name: "Kassala" } },
          ],
        }),
      },
    },
  },
}));

function entry(overrides: Partial<InboxEntry> = {}): InboxEntry {
  return {
    id: "t1",
    thread: {
      id: "t1",
      groundSourceId: "src",
      title: "Flooding in Kassala",
      lifecycleState: "reported",
      reviewState: "unverified",
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      promotedSignalId: null,
      createdAt: "2026-09-15T10:00:00Z",
    },
    messages: [],
    senderRef: "h_3f9a2c7b1d0e",
    intakeRef: "HL-3F9A2C",
    title: "Flooding in Kassala",
    text: "Water is rising near the market.\n\nFamilies are leaving.",
    classification: "field_report",
    sentAt: "2026-09-15T10:05:00Z",
    attachments: [],
    omittedMediaCount: 0,
    uncertainty: null,
    priorEntries: 0,
    ...overrides,
  };
}

// Mantine Select (combobox) measures its target; jsdom has no ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);
Element.prototype.scrollIntoView = () => undefined;

const wrap = (ui: React.ReactElement) => render(<MantineProvider>{ui}</MantineProvider>);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("EntryList", () => {
  const baseProps = {
    selectedId: null,
    readIds: new Set<string>(),
    search: "",
    sort: "reportsFirst" as const,
    onSearchChange: vi.fn(),
    onSortToggle: vi.fn(),
    onSelect: vi.fn(),
  };

  it("renders rows with unread state, first paragraph preview and meta", () => {
    wrap(
      <EntryList
        {...baseProps}
        entries={[
          entry(),
          entry({ id: "t2", title: "Second", priorEntries: 2, attachments: [{ url: "u", kind: "photo" }] }),
        ]}
        readIds={new Set(["t2"])}
        selectedId="t2"
      />,
    );
    const rows = screen.getAllByTestId("inbox-entry");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute("data-unread", "true");
    expect(rows[1]).toHaveAttribute("data-unread", "false");
    expect(rows[1]).toHaveAttribute("data-selected", "true");
    expect(rows[0]).toHaveTextContent("Water is rising near the market.");
    expect(rows[0]).not.toHaveTextContent("Families are leaving.");
    expect(rows[1]).toHaveTextContent('list.priorEntries:{"count":2}');
    expect(screen.getByText('list.allLoaded:{"count":2}')).toBeInTheDocument();
  });

  it("wires select, search and sort callbacks", () => {
    wrap(<EntryList {...baseProps} entries={[entry()]} />);
    fireEvent.click(screen.getByTestId("inbox-entry"));
    expect(baseProps.onSelect).toHaveBeenCalledWith("t1");
    fireEvent.change(screen.getByTestId("inbox-search"), { target: { value: "kas" } });
    expect(baseProps.onSearchChange).toHaveBeenCalledWith("kas");
    fireEvent.click(screen.getByTestId("inbox-sort"));
    expect(baseProps.onSortToggle).toHaveBeenCalled();
  });

  it("shows the empty footer when nothing is visible", () => {
    wrap(<EntryList {...baseProps} entries={[]} />);
    expect(screen.getByText("list.empty")).toBeInTheDocument();
  });
});

describe("ReadingPane", () => {
  const baseProps = {
    canReview: true,
    busy: false,
    error: null,
    rejectOpen: false,
    onRejectOpenChange: vi.fn(),
    onAdd: vi.fn(),
    onArchive: vi.fn(),
    onReject: vi.fn(),
    onBack: vi.fn(),
  };

  it("renders the placeholder when nothing is selected", () => {
    wrap(<ReadingPane {...baseProps} entry={null} />);
    expect(screen.getByText("pane.select")).toBeInTheDocument();
    expect(screen.queryByTestId("inbox-action-bar")).not.toBeInTheDocument();
  });

  it("renders narrative, trust line, attachments and actions", () => {
    wrap(
      <ReadingPane
        {...baseProps}
        entry={entry({
          priorEntries: 2,
          uncertainty: "rumour",
          attachments: [
            { url: "https://s3/a.jpg", kind: "photo" },
            { url: "https://s3/b.ogg", kind: "voice" },
          ],
          omittedMediaCount: 1,
        })}
      />,
    );
    expect(screen.getByTestId("inbox-narrative")).toHaveTextContent("Water is rising");
    expect(screen.getByTestId("inbox-trust-line")).toHaveTextContent('pane.trustRepeat:{"count":3}');
    expect(screen.getByText('pane.uncertainty:{"value":"rumour"}')).toBeInTheDocument();
    expect(screen.getAllByTestId("inbox-attachment")).toHaveLength(2);
    expect(screen.getByText('pane.omittedMedia:{"count":1}')).toBeInTheDocument();
    expect(screen.getByText("HL-3F9A2C · 15 Sep 2026")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("inbox-add"));
    expect(baseProps.onAdd).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("inbox-archive"));
    expect(baseProps.onArchive).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("inbox-reject"));
    expect(baseProps.onRejectOpenChange).toHaveBeenCalledWith(true);
  });

  it("hides actions for users who cannot review", () => {
    wrap(<ReadingPane {...baseProps} entry={entry()} canReview={false} />);
    expect(screen.queryByTestId("inbox-action-bar")).not.toBeInTheDocument();
  });

  it("shows the reject reasons and forwards the chosen one", () => {
    wrap(<ReadingPane {...baseProps} entry={entry()} rejectOpen />);
    expect(screen.getByTestId("inbox-reject-popover")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("inbox-reject-duplicate"));
    expect(baseProps.onReject).toHaveBeenCalledWith("duplicate");
  });

  it("requests a translation in the reader's locale and shows the pending state", () => {
    wrap(<ReadingPane {...baseProps} entry={entry()} />);
    fireEvent.click(screen.getByTestId("inbox-translate"));
    expect(requestTranslation).toHaveBeenCalledWith({ threadId: "t1", locale: "en" });
    expect(screen.getByTestId("inbox-translation")).toHaveTextContent("translate.pending");
  });

  it("does not offer translation for media-only entries", () => {
    wrap(<ReadingPane {...baseProps} entry={entry({ text: "" })} />);
    expect(screen.queryByTestId("inbox-translate")).not.toBeInTheDocument();
    expect(screen.getAllByText("pane.noText").length).toBeGreaterThan(0);
  });
});

describe("AddToClearModal", () => {
  const baseProps = { busy: false, error: null, retry: null, onCancel: vi.fn(), onConfirm: vi.fn() };

  it("seeds title and description from the entry and keeps confirm disabled without a location", () => {
    wrap(<AddToClearModal {...baseProps} entry={entry()} />);
    expect(screen.getByTestId("inbox-draft-title")).toHaveValue("Flooding in Kassala");
    expect(screen.getByTestId("inbox-draft-description")).toHaveValue(
      "Water is rising near the market.\n\nFamilies are leaving.",
    );
    expect(screen.getByTestId("inbox-add-confirm")).toBeDisabled();
    expect(screen.getByText("modal.locationRequired")).toBeInTheDocument();
    expect(screen.queryByTestId("inbox-edits-warning")).not.toBeInTheDocument();
  });

  it("flags unsaved text edits", () => {
    wrap(<AddToClearModal {...baseProps} entry={entry()} />);
    fireEvent.change(screen.getByTestId("inbox-draft-title"), { target: { value: "New title" } });
    expect(screen.getByTestId("inbox-edits-warning")).toBeInTheDocument();
  });

  it("confirms with severity and location once a location is picked", () => {
    wrap(<AddToClearModal {...baseProps} entry={entry()} />);
    fireEvent.click(screen.getByTestId("inbox-severity-4"));
    const select = screen.getByTestId("inbox-draft-location");
    fireEvent.click(select);
    fireEvent.click(screen.getByText("Kassala (Sudan)"));
    const confirm = screen.getByTestId("inbox-add-confirm");
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(baseProps.onConfirm).toHaveBeenCalledWith({
      title: "Flooding in Kassala",
      description: "Water is rising near the market.\n\nFamilies are leaving.",
      severity: 4,
      locationId: "kas",
    });
  });

  it("in retry mode shows the banner, relabels the buttons and ignores the backdrop", () => {
    wrap(<AddToClearModal {...baseProps} entry={entry()} retry={{ locationDone: false }} />);
    expect(screen.getByTestId("inbox-retry-banner")).toHaveTextContent("modal.retryLocationBody");
    expect(screen.getByTestId("inbox-add-confirm")).toHaveTextContent("modal.retry");
    expect(screen.getByTestId("inbox-add-cancel")).toHaveTextContent("modal.leaveUnscoped");
    fireEvent.click(screen.getByTestId("inbox-add-modal"));
    expect(baseProps.onCancel).not.toHaveBeenCalled();
  });

  it("closes on backdrop click but not on dialog click", () => {
    wrap(<AddToClearModal {...baseProps} entry={entry()} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(baseProps.onCancel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("inbox-add-modal"));
    expect(baseProps.onCancel).toHaveBeenCalled();
  });
});
