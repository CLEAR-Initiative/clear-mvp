"use client";

import { useRef, useState } from "react";
import {
  Box,
  Stack,
  Textarea,
  Button,
  Group,
  Text,
  Card,
  Loader,
  Alert,
} from "@mantine/core";
import { IconSend, IconRobot, IconAlertTriangle } from "@tabler/icons-react";
import { PageHeader } from "~/components/ui";

interface SourceDocument {
  title?: string;
  content?: string;
  source_id?: string | number;
}

/** One line of the NDJSON stream returned by /api/agent. */
type StreamLine =
  | { user_prompt: string; source_documents: SourceDocument[] }
  | { type: "answer"; content: string };

export default function AgentPage() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<SourceDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function ask() {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setAnswer("");
    setSources([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // NDJSON: one JSON object per line.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIdx).trim();
          buffer = buffer.slice(newlineIdx + 1);
          if (!line) continue;

          let parsed: StreamLine;
          try {
            parsed = JSON.parse(line) as StreamLine;
          } catch {
            continue; // skip malformed line
          }

          if ("type" in parsed && parsed.type === "answer") {
            setAnswer((prev) => prev + parsed.content);
          } else if ("source_documents" in parsed) {
            setSources(parsed.source_documents ?? []);
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  return (
    <>
      <PageHeader
        title="Agent"
        subtitle="Ask the NRC Find knowledge base"
        breadcrumbs={["CLEAR", "Agent"]}
      />

      <Box p={24} style={{ flex: 1, overflowY: "auto" }}>
        <Stack gap={16} style={{ maxWidth: 820 }}>
          <Textarea
            label="Question"
            placeholder="e.g. What is NRC's approach to cash assistance in emergencies?"
            autosize
            minRows={3}
            maxRows={8}
            value={prompt}
            onChange={(e) => setPrompt(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void ask();
            }}
            disabled={loading}
          />

          <Group justify="space-between">
            <Text size="xs" c="#A3A3A3">
              Press ⌘/Ctrl + Enter to send
            </Text>
            <Button
              leftSection={loading ? <Loader size={14} color="white" /> : <IconSend size={16} />}
              onClick={() => void ask()}
              disabled={loading || !prompt.trim()}
              color="#E85D3D"
            >
              {loading ? "Asking…" : "Ask"}
            </Button>
          </Group>

          {error && (
            <Alert
              color="red"
              icon={<IconAlertTriangle size={16} />}
              title="Something went wrong"
            >
              {error}
            </Alert>
          )}

          {(answer || loading) && (
            <Card withBorder radius="md" p={20}>
              <Group gap={8} mb={12}>
                <IconRobot size={18} color="#E85D3D" />
                <Text fw={600} c="#171717">
                  Answer
                </Text>
              </Group>
              <Text style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }} c="#262626">
                {answer}
                {loading && !answer && <Text component="span" c="#A3A3A3">Thinking…</Text>}
              </Text>
            </Card>
          )}

          {sources.length > 0 && (
            <Stack gap={8}>
              <Text fw={600} size="sm" c="#525252">
                Sources ({sources.length})
              </Text>
              {sources.map((src, i) => (
                <Card key={i} withBorder radius="md" p={12} style={{ background: "#FAFAFA" }}>
                  {src.title && (
                    <Text fw={600} size="sm" c="#171717" mb={4}>
                      {src.title}
                    </Text>
                  )}
                  <Text size="xs" c="#525252" lineClamp={4}>
                    {src.content}
                  </Text>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </Box>
    </>
  );
}
