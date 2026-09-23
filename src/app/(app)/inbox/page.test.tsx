import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
const setSeverity = vi.fn();
const setLocation = vi.fn();
const invalidate = vi.fn();
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
      requestTranslation: { useMutation: () => ({ mutate: vi.fn(), data: undefined, isError: false }) },
      translation: { useQuery: () => ({ data: undefined }) },
    },
    signals: {
      updateSeverity: { useMutation: () => ({ mutateAsync: setSeverity, isPending: false }) },
      updateLocation: { useMutation: () => ({ mutateAsync: setLocation, isPending: false }) },
    },
    locations: {
      list: {
        useQuery: () => ({
          isLoading: false,
          data: [{ id: "kas", name: "Kassala", level: 1, parent: { id: "sdn", name: "Sudan" } }],
        }),
      },
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
    promotedSignalId: null,
    createdAt: "2026-09-15T10:00:00Z",
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

  it("rejects with the reason written into the note", () => {
    reviewMutate.mockImplementation((_input, opts) => opts.onSuccess(thread("a")));
    renderPage();
    fireEvent.click(screen.getByTestId("inbox-reject"));
    fireEvent.click(screen.getByTestId("inbox-reject-spam"));
    expect(reviewMutate).toHaveBeenCalledWith(
      { id: "a", decision: "reject", note: "spam: rejectReasons.spam.label" },
      expect.any(Object),
    );
    expect(screen.getByTestId("inbox-toast")).toHaveTextContent("toast.rejected");
  });

  it("promotes, then applies location and severity, and links the signal", async () => {
    reviewMutate.mockImplementation((_input, opts) =>
      opts.onSuccess({ ...thread("a"), promotedSignalId: "sig1" }),
    );
    setLocation.mockResolvedValue({});
    setSeverity.mockResolvedValue({});
    renderPage();
    fireEvent.click(screen.getByTestId("inbox-add"));
    fireEvent.click(screen.getByTestId("inbox-severity-5"));
    fireEvent.click(screen.getByTestId("inbox-draft-location"));
    fireEvent.click(screen.getByText("Kassala (Sudan)"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("inbox-add-confirm"));
    });
    expect(reviewMutate).toHaveBeenCalledWith({ id: "a", decision: "approve_public" }, expect.any(Object));
    await waitFor(() => expect(setLocation).toHaveBeenCalledWith({ id: "sig1", locationId: "kas" }));
    expect(setSeverity).toHaveBeenCalledWith({ id: "sig1", severity: 5 });
    await waitFor(() => expect(screen.getByTestId("inbox-toast")).toHaveTextContent("toast.added"));
    expect(screen.getByText("toast.viewSignal")).toHaveAttribute("href", "/signal/sig1");
  });

  it("keeps the modal open in retry mode when the location write fails, then completes on retry", async () => {
    reviewMutate.mockImplementation((_input, opts) =>
      opts.onSuccess({ ...thread("a"), promotedSignalId: "sig1" }),
    );
    setLocation.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce({});
    setSeverity.mockResolvedValue({});
    renderPage();
    fireEvent.click(screen.getByTestId("inbox-add"));
    fireEvent.click(screen.getByTestId("inbox-severity-3"));
    fireEvent.click(screen.getByTestId("inbox-draft-location"));
    fireEvent.click(screen.getByText("Kassala (Sudan)"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("inbox-add-confirm"));
    });
    await waitFor(() => expect(screen.getByTestId("inbox-retry-banner")).toBeInTheDocument());
    expect(screen.queryByTestId("inbox-toast")).not.toBeInTheDocument();
    expect(invalidate).not.toHaveBeenCalled();
    expect(setSeverity).not.toHaveBeenCalled();
    // Escape and J must not leave retry mode.
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    fireEvent.keyDown(window, { key: "j" });
    expect(screen.getByTestId("inbox-retry-banner")).toBeInTheDocument();
    expect(screen.getAllByTestId("inbox-entry")[0]).toHaveAttribute("data-selected", "true");

    await act(async () => {
      fireEvent.click(screen.getByTestId("inbox-add-confirm"));
    });
    expect(reviewMutate).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(setLocation).toHaveBeenCalledTimes(2));
    expect(setSeverity).toHaveBeenCalledWith({ id: "sig1", severity: 3 });
    await waitFor(() => expect(screen.getByTestId("inbox-toast")).toHaveTextContent("toast.added"));
    expect(invalidate).toHaveBeenCalled();
  });

  it("lets the reviewer leave the signal unscoped with a partial toast", async () => {
    reviewMutate.mockImplementation((_input, opts) =>
      opts.onSuccess({ ...thread("a"), promotedSignalId: "sig1" }),
    );
    setLocation.mockRejectedValue(new Error("boom"));
    renderPage();
    fireEvent.click(screen.getByTestId("inbox-add"));
    fireEvent.click(screen.getByTestId("inbox-draft-location"));
    fireEvent.click(screen.getByText("Kassala (Sudan)"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("inbox-add-confirm"));
    });
    await waitFor(() => expect(screen.getByTestId("inbox-retry-banner")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("inbox-add-cancel"));
    expect(screen.getByTestId("inbox-toast")).toHaveTextContent("toast.addedPartial");
    expect(screen.queryByTestId("inbox-add-modal")).not.toBeInTheDocument();
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
    expect(setLocation).not.toHaveBeenCalled();
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
