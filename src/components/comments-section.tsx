"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Box, Text, Group, Avatar, Badge, Textarea, Button, Skeleton, ActionIcon, Menu } from "@mantine/core";
import { IconMessageCircle, IconSend, IconDots, IconTrash, IconArrowBack } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { GqlUserComment } from "~/lib/types/graphql";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function CommentSkeleton() {
  return (
    <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
      <Group align="flex-start" gap={10}>
        <Skeleton circle height={30} />
        <Box style={{ flex: 1 }}>
          <Group gap={8} mb={6}>
            <Skeleton height={10} width={80} />
            <Skeleton height={10} width={40} style={{ marginLeft: "auto" }} />
          </Group>
          <Skeleton height={10} width="90%" mb={4} />
          <Skeleton height={10} width="60%" />
        </Box>
      </Group>
    </Box>
  );
}

interface CommentRowProps {
  comment: GqlUserComment;
  isLast: boolean;
  currentUserId?: string;
  onReply: (comment: GqlUserComment) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function CommentRow({ comment, isLast, currentUserId, onReply, onDelete, isDeleting }: CommentRowProps) {
  const t = useTranslations("common.comments");
  const tActions = useTranslations("common.actions");
  const format = useFormatter();
  const isOwn = currentUserId === comment.user.id;

  return (
    <Box
      px={16}
      py={12}
      style={{
        borderBottom: isLast ? undefined : "1px solid var(--color-border)",
        opacity: isDeleting ? 0.4 : 1,
        transition: "opacity 0.15s",
      }}
    >
      <Group align="flex-start" gap={10}>
        <Avatar
          src={comment.user.image}
          size={30}
          radius="xl"
          style={{
            background: "var(--color-accent-light)",
            color: "var(--color-accent)",
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {getInitials(comment.user.name)}
        </Avatar>
        <Box style={{ flex: 1 }}>
          <Group gap={8} mb={4} justify="space-between">
            <Group gap={8}>
              <Text size="xs" fw={600} c="var(--color-text-primary)">
                {comment.user.name ?? t("unknownUser")}
              </Text>
              {comment.isCommentReply && (
                <Badge size="xs" variant="light" color="neutral" leftSection={<IconArrowBack size={9} />}>
                  {t("replyBadge")}
                </Badge>
              )}
              <Text size="xs" c="var(--color-text-muted)">
                {format.relativeTime(new Date(comment.createdAt))}
              </Text>
            </Group>
            <Group gap={4}>
              <ActionIcon
                size="xs"
                variant="subtle"
                color="neutral"
                onClick={() => onReply(comment)}
                title={t("replyAction")}
              >
                <IconArrowBack size={12} />
              </ActionIcon>
              {isOwn && (
                <Menu withinPortal position="bottom-end" shadow="sm">
                  <Menu.Target>
                    <ActionIcon size="xs" variant="subtle" color="neutral">
                      <IconDots size={12} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      color="critical"
                      leftSection={<IconTrash size={12} />}
                      onClick={() => onDelete(comment.id)}
                    >
                      {tActions("delete")}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              )}
            </Group>
          </Group>
          <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.6 }}>
            {comment.comment}
          </Text>
          {comment.tags.length > 0 && (
            <Group gap={4} mt={6}>
              {comment.tags.map((tag) => (
                <Badge key={tag.user.id} size="xs" variant="light" color="accent">
                  @{tag.user.name}
                </Badge>
              ))}
            </Group>
          )}
        </Box>
      </Group>
    </Box>
  );
}

interface CommentsSectionProps {
  entityId: string;
  entityType: "event" | "signal" | "crisis";
}

export function CommentsSection({ entityId, entityType }: CommentsSectionProps) {
  const t = useTranslations("common.comments");
  const [draft, setDraft] = useState("");
  const { data: me } = api.auth.me.useQuery();
  const currentUserId = me?.user?.id;
  const [replyingTo, setReplyingTo] = useState<GqlUserComment | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const utils = api.useUtils();
  const queryKey = { entityId, entityType };

  const query = api.comments.list.useQuery(queryKey, { staleTime: 1000 * 60 * 2 });

  const addComment = api.comments.add.useMutation({
    onSuccess: () => {
      setDraft("");
      setReplyingTo(null);
      void utils.comments.list.invalidate(queryKey);
    },
  });

  const replyToComment = api.comments.reply.useMutation({
    onSuccess: () => {
      setDraft("");
      setReplyingTo(null);
      void utils.comments.list.invalidate(queryKey);
    },
  });

  const deleteComment = api.comments.delete.useMutation({
    onSuccess: (_data, variables) => {
      setDeletingIds((prev) => { const next = new Set(prev); next.delete(variables.id); return next; });
      void utils.comments.list.invalidate(queryKey);
    },
  });

  const comments: GqlUserComment[] = query.data ?? [];
  const isPending = addComment.isPending || replyToComment.isPending;

  function handleSubmit() {
    const text = draft.trim();
    if (!text) return;
    if (replyingTo) {
      replyToComment.mutate({ repliedToCommentId: replyingTo.id, comment: text });
    } else {
      addComment.mutate({ entityId, entityType, comment: text });
    }
  }

  function handleDelete(id: string) {
    setDeletingIds((prev) => new Set(prev).add(id));
    deleteComment.mutate({ id });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit();
  }

  return (
    <>
      {/* Header */}
      <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Group gap={8}>
          <IconMessageCircle size={14} color="var(--color-text-secondary)" />
          <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
            {t("title")}
          </Text>
          {!query.isLoading && (
            <Badge size="xs" variant="light" color="neutral" style={{ fontWeight: 600 }}>
              {comments.length}
            </Badge>
          )}
        </Group>
      </Box>

      {/* Comment list */}
      {query.isLoading ? (
        <>
          <CommentSkeleton />
          <CommentSkeleton />
        </>
      ) : comments.length === 0 ? (
        <Box px={16} py={20} style={{ textAlign: "center" }}>
          <Text size="sm" c="var(--color-text-muted)">
            {t("empty")}
          </Text>
        </Box>
      ) : (
        comments.map((c, i) => (
          <CommentRow
            key={c.id}
            comment={c}
            isLast={i === comments.length - 1}
            currentUserId={currentUserId}
            onReply={setReplyingTo}
            onDelete={handleDelete}
            isDeleting={deletingIds.has(c.id)}
          />
        ))
      )}

      {/* Input */}
      <Box px={16} py={12} style={{ borderTop: "1px solid var(--color-border)" }}>
        {replyingTo && (
          <Group gap={6} mb={8} p={8} style={{ background: "var(--color-bg-muted)", borderRadius: 4 }}>
            <IconArrowBack size={12} color="var(--color-text-muted)" />
            <Text size="xs" c="var(--color-text-muted)" style={{ flex: 1 }}>
              {t.rich("replyingTo", {
                name: replyingTo.user.name ?? t("unknownUser"),
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </Text>
            <ActionIcon size="xs" variant="subtle" color="neutral" onClick={() => setReplyingTo(null)}>
              ×
            </ActionIcon>
          </Group>
        )}
        <Textarea
          placeholder={replyingTo ? t("placeholderReply", { name: replyingTo.user.name ?? t("unknownUser") }) : t("placeholderAdd")}
          value={draft}
          onChange={(e) => setDraft(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          minRows={2}
          size="xs"
          styles={{ input: { fontSize: 13 } }}
          mb={8}
        />
        <Group justify="space-between" align="center">
          <Text size="xs" c="var(--color-text-muted)">
            {t("shortcutHint")}
          </Text>
          <Button
            size="xs"
            leftSection={<IconSend size={12} />}
            onClick={handleSubmit}
            loading={isPending}
            disabled={!draft.trim()}
            color="accent"
            style={{ fontSize: 12 }}
          >
            {t("post")}
          </Button>
        </Group>
      </Box>
    </>
  );
}
