"use client";

import { useRef, useState } from "react";
import { Button, Group, Select, Text, TextInput } from "@mantine/core";
import { useTranslations } from "next-intl";
import { IconMail } from "@tabler/icons-react";
import { api } from "~/trpc/react";

export const TEAM_ROLE_OPTIONS = [
  "team_admin",
  "analyst",
  "emergency_response_manager",
  "team_member",
] as const;
export type TeamRole = (typeof TEAM_ROLE_OPTIONS)[number];

export function isTeamRole(v: string): v is TeamRole {
  return (TEAM_ROLE_OPTIONS as readonly string[]).includes(v);
}

// Loose shape check only; clear-api validates the address for real.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function looksLikeEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim());
}

type Outcome =
  | { kind: "invited"; email: string; role: TeamRole }
  | { kind: "added"; email: string }
  | { kind: "error"; message: string };

/**
 * Invite someone to this team by email. clear-api's `inviteUser` adds an
 * existing org member to the team at once; anyone else gets an invite email
 * and joins the team when they accept it. Org admins and team admins of this
 * team may call it.
 */
export function InviteByEmail({
  teamId,
  organisationId,
  email,
  onEmailChange,
}: {
  teamId: string;
  organisationId: string;
  email: string;
  onEmailChange: (email: string) => void;
}) {
  const t = useTranslations("settings.team.members.invite");
  const utils = api.useUtils();
  const invite = api.invitations.invite.useMutation();
  const [role, setRole] = useState<TeamRole>("team_member");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const inFlight = useRef(false);

  const trimmed = email.trim();
  const valid = looksLikeEmail(trimmed);

  async function handleInvite() {
    // The ref blocks a second Enter before `isPending` reaches a re-render.
    if (!valid || inFlight.current || invite.isPending) return;
    inFlight.current = true;
    setOutcome(null);
    try {
      const result = await invite.mutateAsync({
        email: trimmed,
        organisationId,
        role: "member",
        teams: [{ teamId, teamRole: role }],
      });
      if (result.status === "accepted") {
        setOutcome({ kind: "added", email: trimmed });
        void utils.teams.team.invalidate({ id: teamId });
      } else {
        setOutcome({ kind: "invited", email: trimmed, role });
      }
      onEmailChange("");
    } catch (err) {
      setOutcome({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <>
      <Group mt="sm" gap="sm" align="flex-end">
        <TextInput
          label={t("emailLabel")}
          placeholder={t("emailPlaceholder")}
          type="email"
          value={email}
          onChange={(e) => {
            onEmailChange(e.currentTarget.value);
            setOutcome(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleInvite();
          }}
          size="xs"
          w={280}
        />
        <Select
          label={t("roleLabel")}
          data={[...TEAM_ROLE_OPTIONS]}
          value={role}
          onChange={(v) => setRole(v && isTeamRole(v) ? v : "team_member")}
          size="xs"
          w={150}
        />
        <Button
          size="xs"
          variant="light"
          leftSection={<IconMail size={14} />}
          onClick={handleInvite}
          loading={invite.isPending}
          disabled={!valid}
        >
          {t("submit")}
        </Button>
      </Group>
      {outcome?.kind === "invited" && (
        <Text size="xs" c="green" mt={6} role="status">
          {t("sent", { email: outcome.email, role: outcome.role })}
        </Text>
      )}
      {outcome?.kind === "added" && (
        <Text size="xs" c="green" mt={6} role="status">
          {t("addedExisting", { email: outcome.email })}
        </Text>
      )}
      {outcome?.kind === "error" && (
        <Text size="xs" c="red" mt={6} role="alert">
          {outcome.message}
        </Text>
      )}
    </>
  );
}
