import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { GqlCaseProposal, GqlHotlineInbox, GqlReviewCaseProposal, GqlTask } from "~/lib/types/graphql";

/**
 * Page-level tests for the triage flow: role gate, filter/selection,
 * and the three review actions against a mocked tRPC layer. The point is
 * the orchestration in page.tsx (promote -> location -> severity ->
 * toast -> advance), not the rendering of the child components.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  useFormatter: () => ({ dateTime: () => "15 Sep 2026", relativeTime: () => "1 month ago", number: (n: number) => n.toLocaleString("en") }),
  useLocale: () => "en",
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

/** `hotline_inbox` (the page), with per-key overrides for the others.
 * `event_enrichment` (My requests) is off unless a test turns it on, so the
 * Review-item cases see the page they always did. */
let flagEnabled = true;
let flags: Record<string, boolean> = {};
vi.mock("~/components/feature-flags-provider", () => ({
  useFeatureEnabled: (key: string) => flags[key] ?? (key === "event_enrichment" ? false : flagEnabled),
}));

let role = "admin";
/** The session query still in flight (the first render of a cold page). */
let authLoading = false;
const reviewMutate = vi.fn();
const retryMutateAsync = vi.fn();
const invalidate = vi.fn(async () => undefined);
let inboxData: GqlHotlineInbox;
let myTasksData: { tasks: GqlTask[]; eventTitles: Record<string, string | null> } = { tasks: [], eventTitles: {} };
const myTasksQuery = vi.fn((_input: unknown, opts: { enabled: boolean }) => ({
  data: opts.enabled ? myTasksData : undefined,
  isFetching: false,
  isLoading: false,
  error: null,
}));
let casesData: GqlReviewCaseProposal[] = [];
const casesQuery = vi.fn((_input: unknown, opts: { enabled: boolean }) => ({
  data: opts.enabled ? casesData : undefined,
  isFetching: false,
  isLoading: false,
  error: null,
}));
const decideCaseMutate = vi.fn();
/** The case row's mutation state (one hook per row; tests set it for all). */
let caseMutation: { isPending: boolean; isError: boolean; error: { message: string; data?: { code?: string } } | null } = {
  isPending: false,
  isError: false,
  error: null,
};
/** The Event's enrichment, as the Task pane reads it for a produced proposal. */
let forEventCases: GqlCaseProposal[] = [];
let forEventError = false;
const forEventQuery = vi.fn((_input: unknown, opts: { enabled: boolean }) => ({
  data: opts.enabled && !forEventError ? { tasks: [], caseProposals: forEventCases } : undefined,
  isSuccess: opts.enabled && !forEventError,
  isError: opts.enabled && forEventError,
}));
const forEventFetch = vi.fn(async () => ({ tasks: [], caseProposals: forEventCases }));
const cancelMutate = vi.fn();
let cancelSucceeded = false;

vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({
      ground: {
        hotlineInbox: { invalidate },
        threads: { invalidate },
        messages: { invalidate },
      },
      tasks: {
        proposedCaseProposals: { invalidate },
        reviewCount: { invalidate },
        forEvent: { invalidate, fetch: forEventFetch },
        computedPriors: { invalidate },
        myTasks: { invalidate },
      },
    }),
    auth: {
      me: {
        useQuery: () =>
          authLoading ? { data: undefined, isLoading: true } : { data: { user: { id: "u", role } }, isLoading: false },
      },
    },
    tasks: {
      myTasks: { useQuery: (input: unknown, opts: { enabled: boolean }) => myTasksQuery(input, opts) },
      proposedCaseProposals: { useQuery: (input: unknown, opts: { enabled: boolean }) => casesQuery(input, opts) },
      forEvent: { useQuery: (input: unknown, opts: { enabled: boolean }) => forEventQuery(input, opts) },
      decideCaseProposal: {
        useMutation: () => ({ mutate: decideCaseMutate, ...caseMutation, data: undefined, variables: undefined }),
      },
      cancel: { useMutation: () => ({ mutate: cancelMutate, isPending: false, isError: false, isSuccess: cancelSucceeded }) },
    },
    ground: {
      hotlineInbox: {
        useQuery: (_input: unknown, opts: { enabled: boolean }) => ({
          data: opts.enabled ? inboxData : undefined,
          isFetching: false,
          error: null,
        }),
      },
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

function webCase(id: string, overrides: Partial<GqlReviewCaseProposal> = {}): GqlReviewCaseProposal {
  return {
    id,
    eventId: "evt-1",
    event: { id: "evt-1", title: "Floods in Kassala", types: ["FL"] },
    taskId: "task-web",
    state: "proposed",
    sourceUrl: `https://example.test/${id}`,
    quote: `Quote of ${id}`,
    occurredAt: "2019-08-10T00:00:00Z",
    locationLabel: "Kassala",
    locationId: null,
    hazardType: "FL",
    geographicScope: "district",
    figures: [],
    matchedEventId: null,
    methodVersion: "web-cases@1",
    decidedById: null,
    decidedAt: null,
    decisionRationale: null,
    resultSignalId: null,
    resultEventId: null,
    createdAt: "2026-09-16T10:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  flagEnabled = true;
  flags = {};
  role = "admin";
  authLoading = false;
  myTasksData = { tasks: [], eventTitles: {} };
  forEventCases = [];
  forEventError = false;
  casesData = [];
  caseMutation = { isPending: false, isError: false, error: null };
  cancelMutate.mockReset();
  cancelSucceeded = false;
  myTasksQuery.mockClear();
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
  decideCaseMutate.mockReset();
  invalidate.mockReset();
});

const renderPage = () => render(<MantineProvider><InboxPage /></MantineProvider>);

describe("InboxPage access", () => {
  it("blocks a viewer", () => {
    role = "viewer";
    renderPage();
    expect(screen.getByTestId("inbox-no-access")).toBeInTheDocument();
    expect(screen.queryByTestId("inbox-page")).not.toBeInTheDocument();
  });

  it("blocks an analyst while impact_prior_review is off: the hotline is admins' only", () => {
    role = "analyst";
    flags = { impact_prior_review: false };
    renderPage();
    expect(screen.getByTestId("inbox-no-access")).toBeInTheDocument();
  });

  it("blocks when both flags are off", () => {
    flagEnabled = false;
    renderPage();
    expect(screen.getByTestId("inbox-no-access")).toBeInTheDocument();
  });

  it("admits an analyst to the Review items only: no hotline fetch, no hotline filters, proposed signals first", () => {
    role = "analyst";
    casesData = [webCase("cp-1")];
    renderPage();
    expect(screen.getByTestId("inbox-page")).toBeInTheDocument();
    expect(casesQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: true }));
    expect(screen.queryByTestId("inbox-filter-reports")).not.toBeInTheDocument();
    expect(screen.getByTestId("inbox-filter-proposals")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("inbox-filter-proposals")).toHaveTextContent("1");
    expect(screen.getByTestId("inbox-filter-all")).toBeInTheDocument();
    expect(screen.getAllByTestId("inbox-entry")).toHaveLength(1);
    expect(screen.getByText('awaiting:{"count":1}')).toBeInTheDocument();
    // The hotline threads the mock would return are not listed.
    expect(screen.queryByText("Thread a")).not.toBeInTheDocument();
  });

  it("lands an analyst on Proposed signals even when the page rendered before the session and the flags arrived", () => {
    role = "analyst";
    casesData = [webCase("cp-1")];
    authLoading = true;
    const view = renderPage();
    expect(screen.queryByTestId("inbox-page")).not.toBeInTheDocument();
    // Session in, flags still at their defaults (the new flag off): only Everything applies.
    authLoading = false;
    flags = { impact_prior_review: false };
    view.rerender(<MantineProvider><InboxPage /></MantineProvider>);
    expect(screen.queryByTestId("inbox-page")).not.toBeInTheDocument();
    // The server's flags land.
    flags = {};
    view.rerender(<MantineProvider><InboxPage /></MantineProvider>);
    expect(screen.getByTestId("inbox-filter-proposals")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("inbox-filter-all")).toHaveAttribute("data-active", "false");
  });

  it("falls back from a chosen filter that stops applying", () => {
    casesData = [webCase("cp-1")];
    const view = renderPage();
    fireEvent.click(screen.getByTestId("inbox-filter-proposals"));
    expect(screen.getByTestId("inbox-filter-proposals")).toHaveAttribute("data-active", "true");
    flags = { impact_prior_review: false };
    view.rerender(<MantineProvider><InboxPage /></MantineProvider>);
    expect(screen.queryByTestId("inbox-filter-proposals")).not.toBeInTheDocument();
    expect(screen.getByTestId("inbox-filter-reports")).toHaveAttribute("data-active", "true");
  });

  it("keeps an admin on the hotline filters when impact_prior_review is off", () => {
    flags = { impact_prior_review: false };
    renderPage();
    expect(screen.getByTestId("inbox-filter-reports")).toHaveAttribute("data-active", "true");
    expect(screen.queryByTestId("inbox-filter-proposals")).not.toBeInTheDocument();
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

describe("InboxPage proposed signals beside the hotline", () => {
  it("lists an Event's proposed signals beside the threads under Everything; no hotline action or shortcut acts on them", () => {
    casesData = [webCase("cp-1")];
    renderPage();
    expect(casesQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: true }));
    // Not a field report: it is not under the default filter.
    expect(screen.queryByTestId("inbox-kind-pill")).not.toBeInTheDocument();
    expect(screen.getByTestId("inbox-filter-proposals")).toHaveTextContent("1");
    fireEvent.click(screen.getByTestId("inbox-filter-all"));
    expect(screen.getByText('awaiting:{"count":4}')).toBeInTheDocument();
    const row = screen.getAllByTestId("inbox-entry").find((r) => r.getAttribute("data-kind") === "cases")!;
    expect(row).toHaveTextContent("Floods in Kassala");
    expect(within(row).getByTestId("inbox-kind-pill")).toBeInTheDocument();
    // No whole-prior Review item exists any more.
    expect(screen.getAllByTestId("inbox-entry").map((r) => r.getAttribute("data-kind"))).not.toContain("impact_prior");

    fireEvent.click(row);
    expect(screen.getByTestId("inbox-pane")).toHaveAttribute("data-kind", "cases");
    expect(screen.getByRole("link", { name: "event.open" })).toHaveAttribute("href", "/event/evt-1");
    expect(screen.queryByTestId("inbox-action-bar")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "e" });
    expect(reviewMutate).not.toHaveBeenCalled();
  });

  it("does not ask for Review items while impact_prior_review is off", () => {
    flags = { impact_prior_review: false };
    casesData = [webCase("cp-1")];
    renderPage();
    expect(casesQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: false }));
    fireEvent.click(screen.getByTestId("inbox-filter-all"));
    expect(screen.queryByTestId("inbox-kind-pill")).not.toBeInTheDocument();
  });
});

function myTask(id: string, overrides: Partial<GqlTask> = {}): GqlTask {
  return {
    id,
    kind: "event.impact_prior.web",
    requestId: "req-1",
    subjectType: "event",
    subjectId: "evt-1",
    status: "PENDING",
    origin: "user",
    requesterId: "u",
    requester: { id: "u", name: "Ana" },
    leaseOwner: null,
    teamId: null,
    attempts: 0,
    maxAttempts: 3,
    lastError: null,
    cancelRequestedAt: null,
    outcome: null,
    model: null,
    costUsd: null,
    completedAt: null,
    createdAt: "2026-10-07T09:00:00Z",
    updatedAt: "2026-10-07T09:00:00Z",
    ...overrides,
  };
}

describe("InboxPage My requests", () => {
  it("admits a viewer with event_enrichment on, straight to their requests", () => {
    role = "viewer";
    flags = { event_enrichment: true };
    myTasksData = {
      // An older kind from before the web search still lists beside it.
      tasks: [myTask("t-clear", { kind: "event.impact_prior.clear" }), myTask("t-web", { status: "LEASED" })],
      eventTitles: { "evt-1": "Floods in Kassala" },
    };
    renderPage();
    expect(screen.getByTestId("inbox-page")).toBeInTheDocument();
    expect(myTasksQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: true }));
    // No hotline, no Review items for a viewer: My requests and Everything only, on My requests.
    expect(screen.getByTestId("inbox-filter-requests")).toHaveAttribute("data-active", "true");
    expect(screen.queryByTestId("inbox-filter-proposals")).not.toBeInTheDocument();
    expect(screen.queryByTestId("inbox-filter-reports")).not.toBeInTheDocument();
    const rows = screen.getAllByTestId("inbox-entry");
    expect(rows.map((r) => [r.getAttribute("data-kind"), r.getAttribute("data-source-kind"), r.getAttribute("data-status")])).toEqual([
      ["task", "event.impact_prior.clear", "PENDING"],
      ["task", "event.impact_prior.web", "LEASED"],
    ]);
    expect(rows[0]).toHaveTextContent("Floods in Kassala");
    expect(within(rows[0]!).getByTestId("inbox-kind-pill")).toHaveAttribute("data-kind", "task");
    // Requests are not Review items: nothing is awaiting, Everything is empty.
    expect(screen.getByText('awaiting:{"count":0}')).toBeInTheDocument();
    expect(screen.getByTestId("inbox-filter-all")).toHaveTextContent("0");
  });

  it("keeps requests out of Everything and the awaiting count for a decider, under their own filter", () => {
    role = "analyst";
    flags = { impact_prior_review: true, event_enrichment: true };
    casesData = [webCase("cp-1")];
    myTasksData = { tasks: [myTask("t-1")], eventTitles: { "evt-1": "Floods in Kassala" } };
    renderPage();
    // A decider still lands on their Review items.
    expect(screen.getByTestId("inbox-filter-proposals")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("inbox-filter-requests")).toHaveTextContent("1");
    expect(screen.getByText('awaiting:{"count":1}')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("inbox-filter-all"));
    expect(screen.getAllByTestId("inbox-entry").map((r) => r.getAttribute("data-kind"))).toEqual(["cases"]);
    fireEvent.click(screen.getByTestId("inbox-filter-requests"));
    expect(screen.getAllByTestId("inbox-entry").map((r) => r.getAttribute("data-kind"))).toEqual(["task"]);
  });

  it("shows an open request read-only with Cancel, and cancels that Task", () => {
    role = "viewer";
    flags = { event_enrichment: true };
    myTasksData = { tasks: [myTask("t-1")], eventTitles: { "evt-1": "Floods in Kassala" } };
    renderPage();
    const pane = screen.getByTestId("inbox-pane");
    expect(pane).toHaveAttribute("data-kind", "task");
    expect(pane).toHaveAttribute("data-status", "PENDING");
    expect(within(pane).getByTestId("enrichment-task")).toHaveAttribute("data-kind", "event.impact_prior.web");
    expect(within(pane).getByRole("link", { name: "event.open" })).toHaveAttribute("href", "/event/evt-1");
    // No decision controls and no hotline actions on a request.
    expect(screen.queryByTestId("case-proposal-decision")).not.toBeInTheDocument();
    expect(screen.queryByTestId("inbox-action-bar")).not.toBeInTheDocument();
    fireEvent.click(within(pane).getByTestId("inbox-task-cancel"));
    expect(cancelMutate).toHaveBeenCalledWith({ id: "t-1" });
  });

  it("offers no Cancel once a request is done, and says a proposal is awaiting review until it is decided", () => {
    role = "viewer";
    flags = { event_enrichment: true };
    myTasksData = {
      tasks: [myTask("t-1", { status: "COMPLETED", outcome: "produced", completedAt: "2026-10-07T09:10:00Z" })],
      eventTitles: { "evt-1": "Floods in Kassala" },
    };
    // The requester may see their own proposed signals while they are proposed.
    forEventCases = [webCase("cp-1", { taskId: "t-1" })];
    const { unmount } = renderPage();
    expect(screen.queryByTestId("inbox-task-cancel")).not.toBeInTheDocument();
    expect(screen.getByTestId("inbox-task-awaiting-review")).toBeInTheDocument();
    expect(screen.getByTestId("case-proposal")).toHaveAttribute("data-state", "proposed");
    unmount();

    // Once accepted, the row says so and the "awaiting" line is gone.
    forEventCases = [webCase("cp-1", { taskId: "t-1", state: "accepted" })];
    renderPage();
    expect(screen.queryByTestId("inbox-task-awaiting-review")).not.toBeInTheDocument();
    expect(screen.getByTestId("case-proposal")).toHaveAttribute("data-state", "accepted");
  });

  it("points to the Event, rather than claim it awaits review, when the proposal is not the reader's to see", () => {
    role = "viewer";
    flags = { event_enrichment: true };
    myTasksData = {
      tasks: [myTask("t-1", { status: "COMPLETED", outcome: "produced" })],
      eventTitles: { "evt-1": "Floods in Kassala" },
    };
    // Rejected cases are visible to deciders only: nothing comes back for this viewer.
    forEventCases = [];
    renderPage();
    expect(screen.queryByTestId("inbox-task-awaiting-review")).not.toBeInTheDocument();
    expect(screen.getByTestId("inbox-task-proposal-hidden")).toHaveTextContent("requests.producedSeeEvent");
  });

  it("keeps Cancel disabled once it succeeded, until the refetch shows the Task cancelled", () => {
    role = "viewer";
    flags = { event_enrichment: true };
    myTasksData = { tasks: [myTask("t-1")], eventTitles: { "evt-1": "Floods in Kassala" } };
    cancelSucceeded = true;
    renderPage();
    expect(screen.getByTestId("inbox-task-cancel")).toBeDisabled();
  });

  it("shows a web request's cases read-only, polls them while any awaits review, and says when they cannot be read", () => {
    role = "analyst";
    flags = { event_enrichment: true };
    casesData = [];
    myTasksData = {
      tasks: [myTask("t-web", { kind: "event.impact_prior.web", status: "COMPLETED", outcome: "produced" })],
      eventTitles: { "evt-1": "Floods in Kassala" },
    };
    forEventCases = [webCase("cp-1", { taskId: "t-web" }), webCase("cp-other", { taskId: "t-else" })];
    const view = renderPage();
    fireEvent.click(screen.getByTestId("inbox-filter-requests"));
    expect(screen.getByTestId("inbox-task-awaiting-review")).toBeInTheDocument();
    // Only this Task's cases, and no decision on them here: deciders decide in their Review item.
    expect(screen.getAllByTestId("case-proposal").map((c) => c.getAttribute("data-case-id"))).toEqual(["cp-1"]);
    expect(screen.queryByTestId("case-proposal-decision")).not.toBeInTheDocument();
    const opts = forEventQuery.mock.calls.at(-1)![1] as unknown as {
      refetchInterval: (q: { state: { data: unknown } }) => number | false;
    };
    expect(opts.refetchInterval({ state: { data: { caseProposals: forEventCases } } })).toBe(60_000);
    expect(
      opts.refetchInterval({ state: { data: { caseProposals: [{ ...forEventCases[0], state: "accepted" }] } } }),
    ).toBe(false);
    view.unmount();

    forEventError = true;
    renderPage();
    fireEvent.click(screen.getByTestId("inbox-filter-requests"));
    expect(screen.getByTestId("inbox-task-proposal-error")).toHaveTextContent("requests.proposalLoadFailed");
    expect(screen.queryByTestId("inbox-task-proposal-hidden")).not.toBeInTheDocument();
  });

  it("does not ask for requests while event_enrichment is off", () => {
    role = "admin";
    renderPage();
    expect(myTasksQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: false }));
    expect(screen.queryByTestId("inbox-filter-requests")).not.toBeInTheDocument();
  });
});

describe("InboxPage web cases", () => {
  beforeEach(() => {
    role = "analyst";
  });

  it("groups the proposed cases under their Event, and counts the undecided cases", () => {
    casesData = [
      webCase("cp-1"),
      webCase("cp-2", { createdAt: "2026-09-16T09:00:00Z" }),
      webCase("cp-3", { eventId: "evt-2", event: { id: "evt-2", title: "Drought in Kordofan", types: ["DR"] }, createdAt: "2026-09-17T10:00:00Z" }),
    ];
    renderPage();
    expect(casesQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: true }));
    // Three cases wait: three decisions.
    expect(screen.getByTestId("inbox-filter-proposals")).toHaveTextContent("3");
    expect(screen.getByText('awaiting:{"count":3}')).toBeInTheDocument();
    const groups = screen.getAllByTestId("inbox-entry").filter((r) => r.getAttribute("data-kind") === "cases");
    expect(groups.map((g) => [g.textContent?.includes("Drought in Kordofan"), g.getAttribute("data-undecided")])).toEqual([
      [true, "1"],
      [false, "2"],
    ]);
    expect(groups[1]).toHaveAttribute("data-source-kind", "event.impact_prior.web");
    expect(within(groups[1]!).getByTestId("inbox-kind-pill")).toHaveAttribute("data-kind", "cases");

    fireEvent.click(groups[1]!);
    const pane = screen.getByTestId("inbox-pane");
    expect(pane).toHaveAttribute("data-kind", "cases");
    expect(within(pane).getByRole("link", { name: "event.open" })).toHaveAttribute("href", "/event/evt-1");
    expect(within(pane).getAllByTestId("case-proposal").map((c) => c.getAttribute("data-case-id"))).toEqual(["cp-1", "cp-2"]);
    expect(within(pane).getAllByTestId("case-proposal-accept")).toHaveLength(2);
  });

  it("accepts a case in place: the row turns accepted, links its Event, and stays after the list drops it", () => {
    casesData = [webCase("cp-1"), webCase("cp-2", { matchedEventId: "evt-2019", createdAt: "2026-09-16T09:00:00Z" })];
    decideCaseMutate.mockImplementation((_input, opts) =>
      opts.onSuccess({ ...webCase("cp-1"), state: "accepted", resultEventId: "evt-h", resultSignalId: "sig-1" }),
    );
    const view = renderPage();
    const rows = () => screen.getAllByTestId("case-proposal");
    // The matched one says which CLEAR Event it is.
    expect(within(rows()[1]!).getByTestId("case-proposal-matched-event")).toHaveAttribute("href", "/event/evt-2019");
    fireEvent.click(within(rows()[0]!).getByTestId("case-proposal-accept"));
    expect(decideCaseMutate).toHaveBeenCalledWith({ id: "cp-1", decision: "accepted", rationale: undefined }, expect.any(Object));
    expect(rows()[0]).toHaveAttribute("data-state", "accepted");
    expect(within(rows()[0]!).getByTestId("case-proposal-result-event")).toHaveAttribute("href", "/event/evt-h");
    expect(within(rows()[0]!).queryByTestId("case-proposal-decision")).not.toBeInTheDocument();
    expect(screen.getByTestId("inbox-toast").textContent).toBe("toast.accepted");
    // The count is what is still undecided.
    expect(screen.getByText('awaiting:{"count":1}')).toBeInTheDocument();

    // The refetched list no longer returns it: the row stays, decided.
    casesData = [webCase("cp-2", { matchedEventId: "evt-2019", createdAt: "2026-09-16T09:00:00Z" })];
    view.rerender(<MantineProvider><InboxPage /></MantineProvider>);
    expect(rows().map((r) => [r.getAttribute("data-case-id"), r.getAttribute("data-state")])).toEqual([
      ["cp-1", "accepted"],
      ["cp-2", "proposed"],
    ]);
  });

  it("asks for a rationale before rejecting a case", () => {
    casesData = [webCase("cp-1")];
    decideCaseMutate.mockImplementation((_input, opts) =>
      opts.onSuccess({ ...webCase("cp-1"), state: "rejected", decisionRationale: "Another district" }),
    );
    renderPage();
    fireEvent.click(screen.getByTestId("case-proposal-reject"));
    fireEvent.click(screen.getByTestId("case-proposal-confirm-reject"));
    expect(screen.getByText("rationaleRequired")).toBeInTheDocument();
    expect(decideCaseMutate).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId("case-proposal-rationale"), { target: { value: "  Another district  " } });
    fireEvent.click(screen.getByTestId("case-proposal-confirm-reject"));
    expect(decideCaseMutate).toHaveBeenCalledWith({ id: "cp-1", decision: "rejected", rationale: "Another district" }, expect.any(Object));
    expect(screen.getByTestId("case-proposal")).toHaveAttribute("data-state", "rejected");
    expect(screen.getByTestId("case-proposal-rationale-shown")).toHaveTextContent("Another district");
    expect(screen.getByText('awaiting:{"count":0}')).toBeInTheDocument();
  });

  it("shows a CONFLICT and the decision another decider took, rather than swallow it", async () => {
    casesData = [webCase("cp-1")];
    forEventCases = [{ ...webCase("cp-1"), state: "accepted", resultEventId: "evt-h" }];
    caseMutation = { isPending: false, isError: true, error: { message: "CaseProposal is already accepted", data: { code: "CONFLICT" } } };
    decideCaseMutate.mockImplementation((_input, opts) => opts.onError({ data: { code: "CONFLICT" } }));
    renderPage();
    expect(screen.getByTestId("case-proposal-error")).toHaveTextContent("conflict CaseProposal is already accepted");
    fireEvent.click(screen.getByTestId("case-proposal-accept"));
    // Disabled: the row is known to be stale.
    expect(decideCaseMutate).not.toHaveBeenCalled();

    // The per-call path: CONFLICT reads the Event's copy into the row.
    caseMutation = { isPending: false, isError: false, error: null };
    cleanup();
    renderPage();
    fireEvent.click(screen.getByTestId("case-proposal-accept"));
    expect(forEventFetch).toHaveBeenCalledWith({ eventId: "evt-1" }, { staleTime: 0 });
    await waitFor(() => expect(screen.getByTestId("case-proposal")).toHaveAttribute("data-state", "accepted"));
    expect(screen.getByTestId("case-proposal-result-event")).toHaveAttribute("href", "/event/evt-h");
  });
});
