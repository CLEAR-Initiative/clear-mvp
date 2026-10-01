import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { GqlHotlineInbox } from "~/lib/types/graphql";

/**
 * Page-level tests for the triage flow: role gate, filter/selection,
 * and the three review actions against a mocked tRPC layer. The point is
 * the orchestration in page.tsx (promote -> location -> severity ->
 * toast -> advance), not the rendering of the child components.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  useFormatter: () => ({ dateTime: () => "15 Sep 2026", relativeTime: () => "1 month ago" }),
  useLocale: () => "en",
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

let flagEnabled = true;
vi.mock("~/components/feature-flags-provider", () => ({
  useFeatureEnabled: () => flagEnabled,
}));

let role = "admin";
const reviewMutate = vi.fn();
const retryMutateAsync = vi.fn();
const invalidate = vi.fn(async () => undefined);
let inboxData: GqlHotlineInbox;

vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({
      ground: {
        hotlineInbox: { invalidate },
        threads: { invalidate },
        messages: { invalidate },
      },
    }),
    auth: { me: { useQuery: () => ({ data: { user: { id: "u", role } }, isLoading: false }) } },
    ground: {
      hotlineInbox: { useQuery: () => ({ data: inboxData, isFetching: false, error: null }) },
      review: { useMutation: () => ({ mutate: reviewMutate, isPending: false }) },
      retryMessage: { useMutation: () => ({ mutateAsync: retryMutateAsync }) },
      requestTranslation: { useMutation: () => ({ mutate: vi.fn(), data: undefined, isError: false }) },
      translation: { useQuery: () => ({ data: undefined }) },
    },
    subscriptions: {
      disasterTypes: { useQuery: () => ({ isLoading: false, data: [] }) },
    },
    locations: {
      list: {
        useQuery: () => ({
          isLoading: false,
          data: [{ id: "kas", name: "Kassala", level: 1, parent: { id: "sdn", name: "Sudan" } }],
        }),
      },
      getById: { useQuery: () => ({ data: undefined, isFetching: false }) },
    },
  },
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);
Element.prototype.scrollIntoView = () => undefined;

const { default: InboxPage } = await import("./page");

function thread(id: string) {
  return {
    id,
    groundSourceId: "hot1",
    title: `Thread ${id}`,
    lifecycleState: "reported",
    reviewState: "unverified",
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    rejectReason: null,
    promotedSignalId: null,
    createdAt: "2026-09-15T10:00:00Z",
    draftTitle: null as string | null,
    draftSeverity: null as number | null,
    draftLocationId: null as string | null,
    draftDisasterType: null as string | null,
  };
}
function message(id: string, threadId: string, classification: string | null, sentAt: string) {
  return {
    id,
    groundSourceId: "hot1",
    externalId: `whatsapp:+1:${id}`,
    sentAt,
    senderRef: `h_${id}`,
    text: `Text of ${threadId}`,
    mediaKeys: [],
    mediaUrls: [],
    mediaRefs: [],
    omittedMediaCount: 0,
    classification,
    uncertainty: null,
    isEdited: false,
    threadId,
    hasVoice: false,
    transcript: null as string | null,
    language: null as string | null,
    enrichFailedAt: null as string | null,
    enrichError: null as string | null,
    transcribeFailedAt: null as string | null,
    transcribeError: null as string | null,
  };
}

beforeEach(() => {
  flagEnabled = true;
  role = "admin";
  window.localStorage.clear();
  inboxData = {
    sources: [{ id: "hot1", name: "Hotline", kind: "hotline", reviewerRoles: ["analyst"], privacyDefault: "private", isActive: true }],
    threads: [thread("a"), thread("b"), thread("c")],
    messages: [
      message("m1", "a", "field_report", "2026-09-15T10:00:00Z"),
      message("m2", "b", "field_report", "2026-09-15T09:00:00Z"),
      message("m3", "c", null, "2026-09-15T08:00:00Z"),
    ],
  };
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  retryMutateAsync.mockReset();
  invalidate.mockReset();
});

const renderPage = () => render(<MantineProvider><InboxPage /></MantineProvider>);

describe("InboxPage access", () => {
  it("blocks non-admin roles", () => {
    role = "analyst";
    renderPage();
    expect(screen.getByTestId("inbox-no-access")).toBeInTheDocument();
    expect(screen.queryByTestId("inbox-page")).not.toBeInTheDocument();
  });

  it("blocks when the feature flag is off", () => {
    flagEnabled = false;
    renderPage();
    expect(screen.getByTestId("inbox-no-access")).toBeInTheDocument();
  });
});

describe("InboxPage triage", () => {
  it("defaults to field reports, selects the top entry and marks it read", () => {
    renderPage();
    expect(screen.getByTestId("inbox-filter-reports")).toHaveAttribute("data-active", "true");
    const rows = screen.getAllByTestId("inbox-entry");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute("data-selected", "true");
    expect(rows[0]).toHaveAttribute("data-unread", "false");
    expect(rows[1]).toHaveAttribute("data-unread", "true");
    expect(screen.getByText('awaiting:{"count":3}')).toBeInTheDocument();
  });

  it("switches filters and shows the unclassified entry", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("inbox-filter-unclassified"));
    const rows = screen.getAllByTestId("inbox-entry");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Thread c");
  });

  it("archives via approve_private, toasts, advances and refetches", () => {
    reviewMutate.mockImplementation((_input, opts) => opts.onSuccess(thread("a")));
    renderPage();
    fireEvent.click(screen.getByTestId("inbox-archive"));
    expect(reviewMutate).toHaveBeenCalledWith(
      { id: "a", decision: "approve_private" },
      expect.any(Object),
    );
    expect(screen.getByTestId("inbox-toast")).toHaveTextContent("toast.archived");
    expect(invalidate).toHaveBeenCalled();
    // Selection moved to the next visible entry.
    expect(screen.getAllByTestId("inbox-entry")[1]).toHaveAttribute("data-selected", "true");
  });

  it("rejects with the structured reason, not a note", () => {
    reviewMutate.mockImplementation((_input, opts) => opts.onSuccess(thread("a")));
    renderPage();
    fireEvent.click(screen.getByTestId("inbox-reject"));
    fireEvent.click(screen.getByTestId("inbox-reject-spam"));
    expect(reviewMutate).toHaveBeenCalledWith(
      { id: "a", decision: "reject", rejectReason: "spam" },
      expect.any(Object),
    );
    expect(screen.getByTestId("inbox-toast")).toHaveTextContent("toast.rejected");
  });

  it("promotes in one mutation carrying the reviewer's edits as overrides, and links the signal", async () => {
    reviewMutate.mockImplementation((_input, opts) =>
      opts.onSuccess({ ...thread("a"), promotedSignalId: "sig1" }),
    );
    renderPage();
    fireEvent.click(screen.getByTestId("inbox-add"));
    fireEvent.change(screen.getByTestId("inbox-draft-title"), { target: { value: "Edited title" } });
    fireEvent.change(screen.getByTestId("inbox-draft-description"), { target: { value: "Edited description" } });
    fireEvent.click(screen.getByTestId("inbox-severity-5"));
    fireEvent.click(screen.getByTestId("inbox-draft-location"));
    fireEvent.click(screen.getByText("Kassala (Sudan)"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("inbox-add-confirm"));
    });
    expect(reviewMutate).toHaveBeenCalledTimes(1);
    expect(reviewMutate).toHaveBeenCalledWith(
      {
        id: "a",
        decision: "approve_public",
        overrides: { title: "Edited title", description: "Edited description", severity: 5, locationId: "kas" },
      },
      expect.any(Object),
    );
    await waitFor(() => expect(screen.getByTestId("inbox-toast")).toHaveTextContent("toast.added"));
    expect(screen.getByText("toast.viewSignal")).toHaveAttribute("href", "/signal/sig1");
    expect(invalidate).toHaveBeenCalled();
  });

  it("promotes with the drafted title, severity and location without the reviewer touching them", async () => {
    inboxData.threads[0] = { ...thread("a"), draftTitle: "Drafted title", draftSeverity: 4, draftLocationId: "kas" };
    reviewMutate.mockImplementation((_input, opts) =>
      opts.onSuccess({ ...thread("a"), promotedSignalId: "sig1" }),
    );
    renderPage();
    fireEvent.click(screen.getByTestId("inbox-add"));
    expect(screen.getByTestId("inbox-draft-title")).toHaveValue("Drafted title");
    await act(async () => {
      fireEvent.click(screen.getByTestId("inbox-add-confirm"));
    });
    expect(reviewMutate).toHaveBeenCalledWith(
      {
        id: "a",
        decision: "approve_public",
        overrides: expect.objectContaining({ title: "Drafted title", severity: 4, locationId: "kas" }),
      },
      expect.any(Object),
    );
    await waitFor(() => expect(screen.getByTestId("inbox-toast")).toHaveTextContent("toast.added"));
  });

  it("keeps the modal open with the error when promotion fails, and a retry promotes", async () => {
    reviewMutate.mockImplementationOnce((_input, opts) => opts.onError(new Error("boom")));
    renderPage();
    fireEvent.click(screen.getByTestId("inbox-add"));
    fireEvent.click(screen.getByTestId("inbox-draft-location"));
    fireEvent.click(screen.getByText("Kassala (Sudan)"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("inbox-add-confirm"));
    });
    expect(screen.getByTestId("inbox-add-modal")).toHaveTextContent("boom");
    expect(screen.queryByTestId("inbox-toast")).not.toBeInTheDocument();
    expect(invalidate).not.toHaveBeenCalled();

    reviewMutate.mockImplementationOnce((_input, opts) =>
      opts.onSuccess({ ...thread("a"), promotedSignalId: "sig1" }),
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("inbox-add-confirm"));
    });
    expect(reviewMutate).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByTestId("inbox-toast")).toHaveTextContent("toast.added"));
  });

  it("never claims success when promotion returns no signal id", async () => {
    reviewMutate.mockImplementation((_input, opts) => opts.onSuccess(thread("a")));
    renderPage();
    fireEvent.click(screen.getByTestId("inbox-add"));
    fireEvent.click(screen.getByTestId("inbox-draft-location"));
    fireEvent.click(screen.getByText("Kassala (Sudan)"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("inbox-add-confirm"));
    });
    expect(screen.getByTestId("inbox-toast")).toHaveTextContent("toast.addedNoSignal");
  });

  it("surfaces a review error without leaving the entry", () => {
    reviewMutate.mockImplementation((_input, opts) => opts.onError(new Error("forbidden")));
    renderPage();
    fireEvent.click(screen.getByTestId("inbox-archive"));
    expect(screen.getByText("forbidden")).toBeInTheDocument();
    expect(screen.getAllByTestId("inbox-entry")[0]).toHaveAttribute("data-selected", "true");
  });

  it("moves selection with J and K and opens the modal with A", () => {
    renderPage();
    fireEvent.keyDown(window, { key: "j" });
    expect(screen.getAllByTestId("inbox-entry")[1]).toHaveAttribute("data-selected", "true");
    fireEvent.keyDown(window, { key: "k" });
    expect(screen.getAllByTestId("inbox-entry")[0]).toHaveAttribute("data-selected", "true");
    fireEvent.keyDown(window, { key: "a" });
    expect(screen.getByTestId("inbox-add-modal")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByTestId("inbox-add-modal")).not.toBeInTheDocument();
  });
});

describe("InboxPage pipeline failures", () => {
  const FAILED_AT = "2026-09-15T12:00:00Z";

  /** c: still queued. d: enrichment gave up. e: voice note whose
   * transcription gave up (and so also holds enrichment). */
  beforeEach(() => {
    inboxData.threads.push(thread("d"), thread("e"));
    inboxData.messages.push(
      {
        ...message("m4", "d", null, "2026-09-15T07:00:00Z"),
        enrichFailedAt: FAILED_AT,
        enrichError: "Claude API timeout",
      },
      {
        ...message("m5", "e", null, "2026-09-15T06:00:00Z"),
        hasVoice: true,
        mediaUrls: ["https://s3/hotline/e/voice.ogg?sig=1"],
        transcribeFailedAt: FAILED_AT,
        transcribeError: "unsupported codec",
        enrichFailedAt: FAILED_AT,
        enrichError: "no content",
      },
    );
  });

  const openUnclassified = () => {
    renderPage();
    fireEvent.click(screen.getByTestId("inbox-filter-unclassified"));
    return screen.getAllByTestId("inbox-entry");
  };
  const rowFor = (title: string) =>
    screen.getAllByTestId("inbox-entry").find((r) => r.textContent?.includes(title))!;

  it("keeps queued and failed entries under Unclassified but pills them differently", () => {
    const rows = openUnclassified();
    expect(rows).toHaveLength(3);
    expect(screen.getByTestId("inbox-filter-unclassified")).toHaveTextContent("3");

    const queued = rowFor("Thread c");
    expect(queued).toHaveAttribute("data-processing", "pending");
    expect(within(queued).getByTestId("inbox-classification-pill")).toHaveTextContent("classifications.unclassified");
    expect(within(queued).queryByTestId("inbox-failed-pill")).not.toBeInTheDocument();

    const failed = rowFor("Thread d");
    expect(failed).toHaveAttribute("data-processing", "failed");
    expect(within(failed).queryByTestId("inbox-classification-pill")).not.toBeInTheDocument();
    const pill = within(failed).getByTestId("inbox-failed-pill");
    expect(pill).toHaveTextContent("failure.pill");
    expect(pill).toHaveAttribute("title", "failure.stages.ENRICH: Claude API timeout");
  });

  it("shows no failure notice or Retry for a queued entry", () => {
    openUnclassified();
    fireEvent.click(rowFor("Thread c"));
    expect(screen.queryByTestId("inbox-failure")).not.toBeInTheDocument();
    expect(screen.queryByTestId("inbox-retry")).not.toBeInTheDocument();
  });

  it("shows the recorded error in the reading pane", () => {
    openUnclassified();
    fireEvent.click(rowFor("Thread d"));
    const notice = screen.getByTestId("inbox-failure");
    expect(notice).toHaveTextContent("failure.stages.ENRICH");
    expect(notice).toHaveTextContent("Claude API timeout");
    expect(within(screen.getByTestId("inbox-pane")).getByTestId("inbox-failed-pill")).toBeInTheDocument();
  });

  it("retries enrichment, refetches, and the entry goes back to queued", async () => {
    retryMutateAsync.mockResolvedValue({ id: "m4", enrichFailedAt: null, transcribeFailedAt: null });
    // The refetch brings the message back without its marker.
    invalidate.mockImplementation(async () => {
      inboxData = {
        ...inboxData,
        messages: inboxData.messages.map((m) =>
          m.id === "m4" ? { ...m, enrichFailedAt: null, enrichError: null } : m,
        ),
      };
    });
    openUnclassified();
    fireEvent.click(rowFor("Thread d"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("inbox-retry"));
    });

    expect(retryMutateAsync).toHaveBeenCalledTimes(1);
    expect(retryMutateAsync).toHaveBeenCalledWith({ messageId: "m4", stage: "ENRICH" });
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("inbox-toast")).toHaveTextContent("toast.retried");
    // Still selected, now queued: no notice, the warning pill is back.
    const row = rowFor("Thread d");
    expect(row).toHaveAttribute("data-selected", "true");
    expect(row).toHaveAttribute("data-processing", "pending");
    expect(within(row).getByTestId("inbox-classification-pill")).toHaveTextContent("classifications.unclassified");
    expect(screen.queryByTestId("inbox-failure")).not.toBeInTheDocument();
  });

  it("retries transcription before enrichment for a failed voice note", async () => {
    retryMutateAsync.mockResolvedValue({});
    openUnclassified();
    fireEvent.click(rowFor("Thread e"));
    expect(screen.getByTestId("inbox-voice-transcription-failed")).toHaveAttribute("title", "unsupported codec");
    expect(screen.getByTestId("inbox-transcript")).toHaveAttribute("data-status", "failed");
    expect(screen.getAllByTestId("inbox-failure-item").map((li) => li.dataset.stage)).toEqual(["TRANSCRIBE", "ENRICH"]);

    await act(async () => {
      fireEvent.click(screen.getByTestId("inbox-retry"));
    });
    expect(retryMutateAsync.mock.calls.map(([input]) => input)).toEqual([
      { messageId: "m5", stage: "TRANSCRIBE" },
      { messageId: "m5", stage: "ENRICH" },
    ]);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("surfaces a retry error, still refetches, and does not toast success", async () => {
    retryMutateAsync.mockRejectedValue(new Error("Ground message not found"));
    openUnclassified();
    fireEvent.click(rowFor("Thread d"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("inbox-retry"));
    });
    expect(screen.getByTestId("inbox-failure")).toHaveTextContent("Ground message not found");
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("inbox-toast")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("inbox-retry")).not.toBeDisabled());
  });

  it("disables Retry while the retry is in flight", async () => {
    let resolve: () => void = () => undefined;
    retryMutateAsync.mockImplementation(() => new Promise<void>((r) => { resolve = r; }));
    openUnclassified();
    fireEvent.click(rowFor("Thread d"));
    fireEvent.click(screen.getByTestId("inbox-retry"));
    expect(screen.getByTestId("inbox-retry")).toBeDisabled();
    expect(screen.getByTestId("inbox-retry")).toHaveTextContent("failure.retrying");
    fireEvent.click(screen.getByTestId("inbox-retry"));
    expect(retryMutateAsync).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
    await waitFor(() => expect(screen.getByTestId("inbox-retry")).not.toBeDisabled());
  });

  it("keeps review actions off while the entry's retry is in flight", async () => {
    let resolve: () => void = () => undefined;
    retryMutateAsync.mockImplementation(() => new Promise<void>((r) => { resolve = r; }));
    openUnclassified();
    fireEvent.click(rowFor("Thread d"));
    fireEvent.click(screen.getByTestId("inbox-retry"));
    expect(screen.getByTestId("inbox-archive")).toBeDisabled();
    fireEvent.keyDown(window, { key: "e" });
    expect(reviewMutate).not.toHaveBeenCalled();
    await act(async () => resolve());
    await waitFor(() => expect(screen.getByTestId("inbox-archive")).not.toBeDisabled());
  });

  it("keeps a retry's state on its own entry when the reader moves on mid-retry", async () => {
    let reject: (err: Error) => void = () => undefined;
    retryMutateAsync.mockImplementation(() => new Promise<void>((_r, rj) => { reject = rj; }));
    openUnclassified();
    fireEvent.click(rowFor("Thread d"));
    fireEvent.click(screen.getByTestId("inbox-retry"));

    fireEvent.click(rowFor("Thread e"));
    expect(screen.getByTestId("inbox-retry")).not.toBeDisabled();
    expect(screen.getByTestId("inbox-retry")).toHaveTextContent("failure.retry");

    await act(async () => reject(new Error("Ground message not found")));
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("inbox-failure")).not.toHaveTextContent("Ground message not found");
    expect(screen.queryByTestId("inbox-toast")).not.toBeInTheDocument();
  });

  it("retries every message even when one keeps failing, and says how many went back", async () => {
    inboxData.threads.push(thread("f"));
    inboxData.messages.push(
      { ...message("m6", "f", null, "2026-09-15T05:00:00Z"), enrichFailedAt: FAILED_AT },
      { ...message("m7", "f", null, "2026-09-15T05:30:00Z"), enrichFailedAt: FAILED_AT },
    );
    retryMutateAsync.mockImplementation(async ({ messageId }: { messageId: string }) => {
      if (messageId === "m6") throw new Error("upstream 503");
      return {};
    });
    openUnclassified();
    fireEvent.click(rowFor("Thread f"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("inbox-retry"));
    });
    expect(retryMutateAsync.mock.calls.map(([input]) => input.messageId)).toEqual(["m6", "m7"]);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("inbox-failure")).toHaveTextContent(
      'failure.partial:{"done":1,"total":2,"error":"upstream 503"}',
    );
    expect(screen.queryByTestId("inbox-toast")).not.toBeInTheDocument();
  });
});
