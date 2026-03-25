"use client";

import { useState } from "react";
import { Box, Text, Group, Avatar, Badge, Textarea, Button, Skeleton } from "@mantine/core";
import { IconMessageCircle, IconSend } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { GqlUserComment } from "~/lib/types/graphql";

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function CommentRow({ comment, isLast }: { comment: GqlUserComment; isLast: boolean }) {
  return (
    <Box
      px={16}
      py={12}
      style={{ borderBottom: isLast ? undefined : "1px solid var(--mantine-color-neutral-2)" }}
    >
      <Group align="flex-start" gap={10}>
        <Avatar
          src={comment.user.image}
          size={30}
          radius="xl"
          style={{
            background: "var(--mantine-color-accent-0)",
            color: "var(--mantine-color-accent-5)",
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {getInitials(comment.user.name)}
        </Avatar>
        <Box style={{ flex: 1 }}>
          <Group gap={8} mb={4}>
            <Text size="xs" fw={600} c="neutral.9">
              {comment.user.name ?? "Unknown"}
            </Text>
            <Text size="xs" c="neutral.4" style={{ marginLeft: "auto" }}>
              {formatTimeAgo(comment.createdAt)}
            </Text>
          </Group>
          {comment.isCommentReply && (
            <Text size="xs" c="neutral.4" mb={4} style={{ fontStyle: "italic" }}>
              ↩ Reply
            </Text>
          )}
          <Text size="sm" c="neutral.7" style={{ lineHeight: 1.6 }}>
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

function CommentSkeleton() {
  return (
    <Box px={16} py={12} style={{ borderBottom: "1px solid var(--mantine-color-neutral-2)" }}>
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

interface CommentsSectionProps {
  entityId: string;
  entityType: "event" | "signal";
}

export function CommentsSection({ entityId, entityType }: CommentsSectionProps) {
  const [draft, setDraft] = useState("");

  const query = api.comments.list.useQuery(
    { entityId, entityType },
    { staleTime: 1000 * 60 * 2 },
  );

  const comments: GqlUserComment[] = query.data ?? [];

  return (
    <>
      {/* Header */}
      <Box px={16} py={12} style={{ borderBottom: "1px solid var(--mantine-color-neutral-2)" }}>
        <Group gap={8}>
          <IconMessageCircle size={14} color="var(--mantine-color-neutral-6)" />
          <Text fw={600} c="neutral.9" style={{ fontSize: 14 }}>
            Discussion
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
          <Text size="sm" c="neutral.4">
            No comments yet. Be the first to add one.
          </Text>
        </Box>
      ) : (
        comments.map((c, i) => (
          <CommentRow key={c.id} comment={c} isLast={i === comments.length - 1} />
        ))
      )}

      {/* Input — disabled until createComment mutation is available */}
      <Box px={16} py={12} style={{ borderTop: "1px solid var(--mantine-color-neutral-2)" }}>
        <Textarea
          placeholder="Add a comment…"
          value={draft}
          onChange={(e) => setDraft(e.currentTarget.value)}
          minRows={2}
          size="xs"
          styles={{ input: { fontSize: 13 } }}
          mb={8}
          disabled
        />
        <Group justify="flex-end">
          <Button
            size="xs"
            leftSection={<IconSend size={12} />}
            disabled
            title="Posting comments coming soon"
            color="accent"
            style={{ fontSize: 12 }}
          >
            Post
          </Button>
        </Group>
      </Box>
    </>
  );
}
