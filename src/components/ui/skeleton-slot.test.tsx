import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { SkeletonSlot } from "~/components/ui/skeleton-slot";

function renderSlot(pending: boolean) {
  return render(
    <MantineProvider>
      <SkeletonSlot
        pending={pending}
        skeleton={<div data-testid="skeleton">Loading</div>}
      >
        <span data-testid="content">Loaded content</span>
      </SkeletonSlot>
    </MantineProvider>,
  );
}

describe("SkeletonSlot", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders skeleton when pending", () => {
    renderSlot(true);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("content")).not.toBeInTheDocument();
  });

  it("renders children when not pending", () => {
    renderSlot(false);
    expect(screen.getByTestId("content")).toBeInTheDocument();
    expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
  });

  it("applies fade-in class to resolved content", () => {
    const { container } = renderSlot(false);
    expect(container.querySelector(".skeleton-slot-content")).toBeTruthy();
  });
});
