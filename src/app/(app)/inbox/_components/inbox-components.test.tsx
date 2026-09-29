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
/** locations.getById result for a drafted location missing from the list. */
let locationById: unknown = null;
const getLocationById = vi.fn((_input: { id: string }, opts: { enabled: boolean }) => ({
  data: opts.enabled ? locationById : undefined,
  isFetching: false,
}));
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({ ground: { hotlineInbox: { invalidate: vi.fn(async () => undefined) } } }),
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
      getById: {
        useQuery: (input: { id: string }, opts: { enabled: boolean }) => getLocationById(input, opts),
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
      rejectReason: null,
      promotedSignalId: null,
      createdAt: "2026-09-15T10:00:00Z",
      draftTitle: null,
      draftSeverity: null,
      draftLocationId: null,
      draftDisasterType: null,
    },
    // Consistent with `text` (the modal seeds its description from messages).
    messages: [
      { ...message("m1"), text: "Water is rising near the market." },
      { ...message("m2"), text: "Families are leaving." },
    ],
    senderRef: "h_3f9a2c7b1d0e",
    intakeRef: "HL-3F9A2C",
    title: "Flooding in Kassala",
    text: "Water is rising near the market.\n\nFamilies are leaving.",
    classification: "field_report",
    sentAt: "2026-09-15T10:05:00Z",
    attachments: [],
    detachedTranscripts: [],
    transcripts: [],
    omittedMediaCount: 0,
    uncertainty: null,
    priorEntries: 0,
    ...overrides,
  };
}

function message(id: string): InboxEntry["messages"][number] {
  return {
    id,
    groundSourceId: "src",
    externalId: `whatsapp:+1:${id}`,
    sentAt: "2026-09-15T10:00:00Z",
    senderRef: "h_3f9a2c7b1d0e",
    text: "",
    mediaKeys: [],
    mediaUrls: [],
    mediaRefs: [],
    omittedMediaCount: 0,
    classification: null,
    uncertainty: null,
    isEdited: false,
    threadId: "t1",
    hasVoice: false,
    transcript: null,
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
// jsdom has no media stack (canPlayType is always ""); behave like a browser
// that plays Ogg/Opus so voice notes render their inline player.
HTMLMediaElement.prototype.canPlayType = () => "maybe";

const wrap = (ui: React.ReactElement) => render(<MantineProvider>{ui}</MantineProvider>);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  locationById = null;
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
    expect(screen.getAllByTestId("inbox-attachment")).toHaveLength(1);
    // Voice notes play inline, labelled by their position among the attachments.
    expect(screen.getByLabelText('pane.voiceNoteN:{"n":2}')).toHaveAttribute("src", "https://s3/b.ogg");
    expect(screen.getByTestId("inbox-voice-open")).toHaveAttribute("href", "https://s3/b.ogg");
    expect(screen.getByText('pane.omittedMedia:{"count":1}')).toBeInTheDocument();
    expect(screen.getByText("HL-3F9A2C · 15 Sep 2026")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("inbox-add"));
    expect(baseProps.onAdd).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("inbox-archive"));
    expect(baseProps.onArchive).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("inbox-reject"));
    expect(baseProps.onRejectOpenChange).toHaveBeenCalledWith(true);
  });

  it("shows machine transcripts under voice notes, with a pending state", () => {
    wrap(
      <ReadingPane
        {...baseProps}
        entry={entry({
          attachments: [
            { url: "https://s3/a.ogg", kind: "voice", transcript: { status: "ready", text: "The bridge is under water." } },
            { url: "https://s3/b.ogg", kind: "voice", transcript: { status: "pending" } },
          ],
          detachedTranscripts: [{ status: "pending" }],
        })}
      />,
    );
    const transcripts = screen.getAllByTestId("inbox-transcript");
    expect(transcripts).toHaveLength(3);
    expect(transcripts[0]).toHaveAttribute("data-status", "ready");
    expect(transcripts[0]).toHaveTextContent("pane.transcriptLabel");
    expect(transcripts[0]).toHaveTextContent("The bridge is under water.");
    expect(transcripts[1]).toHaveAttribute("data-status", "pending");
    expect(transcripts[1]).toHaveTextContent("pane.transcriptPending");
    // Voice message whose audio is not stored yet: transcript block only.
    expect(transcripts[2]).toHaveTextContent("pane.voiceNotStored");
    // Two inline players (#664) for the stored voice notes, none for the detached one.
    expect(screen.getAllByTestId("inbox-voice-note")).toHaveLength(2);
    expect(transcripts[0]!.previousElementSibling).toHaveAttribute("data-testid", "inbox-voice-note");
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
  const baseProps = { busy: false, error: null, onCancel: vi.fn(), onConfirm: vi.fn() };

  it("seeds title and description from the entry and keeps confirm disabled without a location", () => {
    wrap(<AddToClearModal {...baseProps} entry={entry()} />);
    expect(screen.getByTestId("inbox-draft-title")).toHaveValue("Flooding in Kassala");
    expect(screen.getByTestId("inbox-draft-description")).toHaveValue(
      "Water is rising near the market.\n\nFamilies are leaving.",
    );
    expect(screen.getByTestId("inbox-add-confirm")).toBeDisabled();
    expect(screen.getByText("modal.locationRequired")).toBeInTheDocument();
    // No drafts: nothing is marked as an AI suggestion.
    expect(screen.getByTestId("inbox-severity-none")).toHaveAttribute("data-selected", "true");
    expect(document.querySelector("[data-testid^='inbox-ai-']")).toBeNull();
    expect(screen.queryByTestId("inbox-draft-disaster-type")).not.toBeInTheDocument();
  });

  const drafted = (drafts: Partial<InboxEntry["thread"]>) =>
    entry({ thread: { ...entry().thread, ...drafts } });

  it("pre-fills title, severity and location from the drafts and marks them as AI suggestions", () => {
    wrap(
      <AddToClearModal
        {...baseProps}
        entry={drafted({
          draftTitle: "Flash flooding near Kassala market",
          draftSeverity: 4,
          draftLocationId: "kas",
          draftDisasterType: "flash_flood",
        })}
      />,
    );
    expect(screen.getByTestId("inbox-draft-title")).toHaveValue("Flash flooding near Kassala market");
    expect(screen.getByTestId("inbox-ai-title")).toHaveTextContent("modal.aiSuggested");
    expect(screen.getByTestId("inbox-severity-4")).toHaveAttribute("data-selected", "true");
    expect(screen.getByTestId("inbox-ai-severity")).toBeInTheDocument();
    expect(screen.getByTestId("inbox-draft-location")).toHaveValue("Kassala (Sudan)");
    expect(screen.getByTestId("inbox-ai-location")).toBeInTheDocument();
    // Disaster type is read-only: shown, flagged, never part of the draft.
    expect(screen.getByTestId("inbox-draft-disaster-type")).toHaveTextContent("flash flood");
    expect(screen.getByTestId("inbox-draft-disaster-type")).toHaveTextContent("modal.disasterTypeReadOnly");
    expect(screen.queryByTestId("inbox-location-hint")).not.toBeInTheDocument();

    const confirm = screen.getByTestId("inbox-add-confirm");
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(baseProps.onConfirm).toHaveBeenCalledWith({
      title: "Flash flooding near Kassala market",
      description: "Water is rising near the market.\n\nFamilies are leaving.",
      severity: 4,
      locationId: "kas",
    });
  });

  it("lets the reviewer change or clear every suggestion, dropping the AI marker", () => {
    wrap(
      <AddToClearModal
        {...baseProps}
        entry={drafted({ draftTitle: "Drafted", draftSeverity: 4, draftLocationId: "kas" })}
      />,
    );
    fireEvent.change(screen.getByTestId("inbox-draft-title"), { target: { value: "Reviewer title" } });
    expect(screen.queryByTestId("inbox-ai-title")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("inbox-severity-none"));
    expect(screen.queryByTestId("inbox-ai-severity")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("inbox-draft-location"));
    fireEvent.click(screen.getByText("Sudan"));
    expect(screen.queryByTestId("inbox-ai-location")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("inbox-add-confirm"));
    expect(baseProps.onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Reviewer title", severity: null, locationId: "sdn" }),
    );
  });

  it("keeps a drafted location deeper than admin level 2 selectable", () => {
    wrap(<AddToClearModal {...baseProps} entry={drafted({ draftLocationId: "deep" })} />);
    expect(screen.getByTestId("inbox-draft-location")).toHaveValue("Village (Kassala)");
    expect(screen.getByTestId("inbox-ai-location")).toBeInTheDocument();
    expect(screen.getByTestId("inbox-add-confirm")).toBeEnabled();
    expect(getLocationById).toHaveBeenCalledWith({ id: "deep" }, expect.objectContaining({ enabled: false }));
  });

  it("fetches a drafted location missing from the list by id", () => {
    locationById = { id: "far", name: "Wad Sharifey", level: 4, parent: { id: "kas", name: "Kassala" } };
    wrap(<AddToClearModal {...baseProps} entry={drafted({ draftLocationId: "far" })} />);
    expect(getLocationById).toHaveBeenCalledWith({ id: "far" }, expect.objectContaining({ enabled: true }));
    expect(screen.getByTestId("inbox-draft-location")).toHaveValue("Wad Sharifey (Kassala)");
    expect(screen.getByTestId("inbox-add-confirm")).toBeEnabled();
  });

  it("does not let an unresolvable drafted location be confirmed", () => {
    wrap(<AddToClearModal {...baseProps} entry={drafted({ draftLocationId: "gone" })} />);
    expect(screen.getByTestId("inbox-draft-location")).toHaveValue("");
    expect(screen.getByTestId("inbox-location-hint")).toHaveTextContent("modal.draftLocationUnknown");
    expect(screen.queryByTestId("inbox-ai-location")).not.toBeInTheDocument();
    expect(screen.getByTestId("inbox-add-confirm")).toBeDisabled();
  });

  it("ignores an out-of-range drafted severity", () => {
    wrap(<AddToClearModal {...baseProps} entry={drafted({ draftSeverity: 7 })} />);
    expect(screen.getByTestId("inbox-severity-none")).toHaveAttribute("data-selected", "true");
    expect(screen.queryByTestId("inbox-ai-severity")).not.toBeInTheDocument();
  });

  it("seeds the description with labelled machine transcripts", () => {
    const base = entry();
    wrap(
      <AddToClearModal
        {...baseProps}
        entry={entry({
          text: "Road blocked.",
          transcripts: ["People are stuck."],
          messages: [
            { ...message("m1"), text: "Road blocked." },
            { ...message("m2"), text: "", hasVoice: true, transcript: "People are stuck." },
          ],
          thread: base.thread,
        })}
      />,
    );
    expect(screen.getByTestId("inbox-draft-description")).toHaveValue(
      'Road blocked.\n\nmodal.transcriptInDescription:{"text":"People are stuck."}',
    );
  });

  it("confirms with the reviewer's edited title and description (they are saved now, #625)", () => {
    wrap(<AddToClearModal {...baseProps} entry={entry()} />);
    fireEvent.change(screen.getByTestId("inbox-draft-title"), { target: { value: "New title" } });
    fireEvent.change(screen.getByTestId("inbox-draft-description"), { target: { value: "New body" } });
    fireEvent.click(screen.getByTestId("inbox-draft-location"));
    fireEvent.click(screen.getByText("Kassala (Sudan)"));
    fireEvent.click(screen.getByTestId("inbox-add-confirm"));
    expect(baseProps.onConfirm).toHaveBeenCalledWith({
      title: "New title",
      description: "New body",
      severity: null,
      locationId: "kas",
    });
    // No "not saved" caveats remain anywhere in the modal.
    expect(screen.getByTestId("inbox-add-modal")).not.toHaveTextContent(/NotSaved/);
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

  it("plays voice attachments inline and keeps photos as cards", () => {
    wrap(
      <AddToClearModal
        {...baseProps}
        entry={entry({
          attachments: [
            { url: "https://s3/a.jpg?sig=1", kind: "photo" },
            { url: "https://s3/b.ogg?sig=1", kind: "voice" },
          ],
        })}
      />,
    );
    const player = screen.getByTestId("inbox-voice-player");
    expect(player).toHaveAttribute("preload", "none");
    expect(player).toHaveAttribute("aria-label", 'pane.voiceNoteN:{"n":2}');
    expect(screen.getByText('pane.attachment:{"n":1}').closest("a")).toHaveAttribute("href", "https://s3/a.jpg?sig=1");
  });

  it("closes on overlay click but not on dialog click", () => {
    wrap(<AddToClearModal {...baseProps} entry={entry()} />);
    fireEvent.click(screen.getByTestId("inbox-add-modal"));
    expect(baseProps.onCancel).not.toHaveBeenCalled();
    const overlay = document.querySelector(".mantine-Modal-overlay")!;
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(overlay);
    fireEvent.click(overlay);
    expect(baseProps.onCancel).toHaveBeenCalled();
  });
});
