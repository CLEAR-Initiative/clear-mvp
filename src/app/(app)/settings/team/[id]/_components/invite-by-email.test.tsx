import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";

vi.mock("next-intl", () => ({
  useTranslations:
    (ns?: string) =>
    (key: string, vars?: Record<string, unknown>) =>
      `${ns ? `${ns}.` : ""}${key}${vars ? `:${JSON.stringify(vars)}` : ""}`,
}));

const inviteMutate = vi.fn();
const invalidate = vi.fn();

vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({ teams: { team: { invalidate } } }),
    invitations: {
      invite: {
        useMutation: () => ({ mutateAsync: inviteMutate, isPending: false }),
      },
    },
  },
}));

const { InviteByEmail, looksLikeEmail } = await import("./invite-by-email");

const NS = "settings.team.members.invite";

function Harness({ initial = "" }: { initial?: string }) {
  const [email, setEmail] = useState(initial);
  return (
    <MantineProvider>
      <InviteByEmail
        teamId="team-1"
        organisationId="org-1"
        email={email}
        onEmailChange={setEmail}
      />
    </MantineProvider>
  );
}

const emailInput = () => screen.getByLabelText(`${NS}.emailLabel`) as HTMLInputElement;
const inviteButton = () =>
  screen.getByRole("button", { name: `${NS}.submit` }) as HTMLButtonElement;

beforeEach(() => {
  inviteMutate.mockReset();
  invalidate.mockReset();
});

afterEach(() => cleanup());

describe("looksLikeEmail", () => {
  it("accepts addresses and rejects names and partial input", () => {
    expect(looksLikeEmail("email+steering@jamesfarrell.me")).toBe(true);
    expect(looksLikeEmail("  a@b.org ")).toBe(true);
    expect(looksLikeEmail("Admin User")).toBe(false);
    expect(looksLikeEmail("a@b")).toBe(false);
    expect(looksLikeEmail("")).toBe(false);
  });
});

describe("InviteByEmail", () => {
  it("keeps Invite disabled until the input is an email", () => {
    render(<Harness />);
    expect(inviteButton().disabled).toBe(true);
    fireEvent.change(emailInput(), { target: { value: "not-an-email" } });
    expect(inviteButton().disabled).toBe(true);
    fireEvent.change(emailInput(), { target: { value: "new@example.org" } });
    expect(inviteButton().disabled).toBe(false);
  });

  it("invites into this team with the member org role and says they must accept", async () => {
    inviteMutate.mockResolvedValue({ status: "pending" });
    render(<Harness initial="new@example.org" />);
    fireEvent.click(inviteButton());

    await waitFor(() => expect(inviteMutate).toHaveBeenCalledOnce());
    expect(inviteMutate).toHaveBeenCalledWith({
      email: "new@example.org",
      organisationId: "org-1",
      role: "member",
      teams: [{ teamId: "team-1", teamRole: "team_member" }],
    });
    expect(
      await screen.findByText(
        `${NS}.sent:${JSON.stringify({ email: "new@example.org", role: "team_member" })}`,
      ),
    ).toBeTruthy();
    expect(emailInput().value).toBe("");
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("refreshes the member list when clear-api added an existing org member directly", async () => {
    inviteMutate.mockResolvedValue({ status: "accepted" });
    render(<Harness initial="known@example.org" />);
    fireEvent.click(inviteButton());

    expect(
      await screen.findByText(
        `${NS}.addedExisting:${JSON.stringify({ email: "known@example.org" })}`,
      ),
    ).toBeTruthy();
    expect(invalidate).toHaveBeenCalledWith({ id: "team-1" });
  });

  it("sends one invite when Enter is pressed again while the first is in flight", async () => {
    let resolve!: (v: { status: string }) => void;
    inviteMutate.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<Harness initial="new@example.org" />);
    fireEvent.keyDown(emailInput(), { key: "Enter" });
    fireEvent.keyDown(emailInput(), { key: "Enter" });
    fireEvent.click(inviteButton());
    expect(inviteMutate).toHaveBeenCalledOnce();

    resolve({ status: "pending" });
    expect(await screen.findByRole("status")).toBeTruthy();
  });

  it("shows the API error and keeps the email", async () => {
    inviteMutate.mockRejectedValue(
      new Error("A pending invitation already exists for this email."),
    );
    render(<Harness initial="pending@example.org" />);
    fireEvent.click(inviteButton());

    expect((await screen.findByRole("alert")).textContent).toContain(
      "A pending invitation already exists",
    );
    expect(emailInput().value).toBe("pending@example.org");
  });
});
