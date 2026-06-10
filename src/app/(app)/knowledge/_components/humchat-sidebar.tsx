"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  Box,
  Text,
  Group,
  TextInput,
  UnstyledButton,
  ActionIcon,
  Badge,
} from "@mantine/core";
import {
  IconMessageCircle,
  IconWorld,
  IconChevronRight,
  IconRefresh,
  IconUser,
  IconSend,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { HUMCHAT_SYSTEM_PROMPT, buildHumChatPrompt } from "~/lib/prompts";
import {
  type ChatMessage,
  welcomeMessage,
  exampleQuestions,
  generateResponse,
} from "./knowledge-data";

interface HumChatSidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function HumChatSidebar({ isExpanded, onToggle }: HumChatSidebarProps) {
  const t = useTranslations("knowledge.humchat");
  const format = useFormatter();
  // welcomeMessage.content is resolved via i18n at render time
  const welcome: ChatMessage = { ...welcomeMessage, content: t("welcome") };
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const llmMutation = api.llm.query.useMutation();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    llmMutation.mutate(
      {
        prompt: buildHumChatPrompt(content.trim()),
        system: HUMCHAT_SYSTEM_PROMPT,
        temperature: 0.4,
        maxTokens: 800,
      },
      {
        onSuccess: (data) => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: data.response,
              timestamp: new Date(),
            },
          ]);
        },
        onError: () => {
          // Fallback to local response generator
          const fallbackResponse = generateResponse(content);
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: fallbackResponse,
              timestamp: new Date(),
            },
          ]);
        },
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage(inputValue);
    }
  };

  const renderMarkdown = (content: string) => {
    const html = content
      .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:600">$1</strong>')
      .replace(/^- (.*$)/gim, '<div style="margin-left:12px;font-size:13px">• $1</div>')
      .replace(/^\d+\. (.*$)/gim, '<div style="margin-left:12px;font-size:13px">$&</div>')
      .replace(/\n\n/g, '<div style="height:8px"></div>')
      .replace(/\n/g, "<br />");
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  if (!isExpanded) {
    return (
      <Box
        style={{
          position: "fixed",
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 50,
        }}
      >
        <UnstyledButton
          onClick={onToggle}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#E85D3D",
            color: "white",
            padding: "16px 10px",
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <IconMessageCircle size={16} />
          <span>HumChat AI</span>
        </UnstyledButton>
      </Box>
    );
  }

  return (
    <Box style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-bg-white)", borderLeft: "1px solid var(--color-border)" }}>
      {/* Header */}
      <Box px={16} py={12} className="border-b border-[var(--color-border)]" style={{ background: "var(--color-bg-muted)" }}>
        <Group justify="space-between">
          <Group gap={8}>
            <Box
              style={{
                width: 32,
                height: 32,
                background: "#E85D3D",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconWorld size={16} color="white" />
            </Box>
            <Box>
              <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 13 }}>HumChat AI</Text>
              <Text c="var(--color-text-muted)" style={{ fontSize: 10 }}>{t("subtitle")}</Text>
            </Box>
          </Group>
          <Group gap={4}>
            <Badge size="xs" color="green" variant="light" leftSection={
              <Box style={{ width: 6, height: 6, background: "#059669", borderRadius: "50%" }} />
            }>
              {t("online")}
            </Badge>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              onClick={() => setMessages([welcome])}
              title={t("clearChat")}
            >
              <IconRefresh size={14} />
            </ActionIcon>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              onClick={onToggle}
              title={t("collapse")}
            >
              <IconChevronRight size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </Box>

      {/* Messages */}
      <Box style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((message) => (
          <Box key={message.id} style={{ display: "flex", gap: 8, flexDirection: message.role === "user" ? "row-reverse" : "row" }}>
            <Box
              style={{
                width: 24,
                height: 24,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: message.role === "assistant" ? "#FEF2F0" : "#F0F0F0",
              }}
            >
              {message.role === "assistant" ? <IconWorld size={12} color="#E85D3D" /> : <IconUser size={12} color="#525252" />}
            </Box>
            <Box style={{ flex: 1, textAlign: message.role === "user" ? "right" : "left" }}>
              {message.role === "assistant" && (
                <Text c="#E85D3D" style={{ fontSize: 10, fontWeight: 500, marginBottom: 4 }}>HAI</Text>
              )}
              <Box
                style={{
                  display: "inline-block",
                  textAlign: "left",
                  padding: "8px 12px",
                  fontSize: 13,
                  background: message.role === "assistant" ? "#F9FAFB" : "#E85D3D",
                  color: message.role === "assistant" ? "#525252" : "white",
                  border: message.role === "assistant" ? "1px solid var(--color-border)" : "none",
                  maxWidth: "90%",
                }}
              >
                {message.role === "assistant" ? renderMarkdown(message.content) : <Text style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{message.content}</Text>}
              </Box>
              {message.role === "assistant" && (
                <Text c="var(--color-text-muted)" style={{ fontSize: 9, marginTop: 4 }}>
                  {format.dateTime(message.timestamp, "dateTime")}
                </Text>
              )}
            </Box>
          </Box>
        ))}
        {isTyping && (
          <Box style={{ display: "flex", gap: 8 }}>
            <Box style={{ width: 24, height: 24, background: "#FEF2F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconWorld size={12} color="#E85D3D" />
            </Box>
            <Box style={{ background: "var(--color-bg-muted)", border: "1px solid var(--color-border)", padding: "8px 12px" }}>
              <Box style={{ display: "flex", gap: 4 }}>
                <Box style={{ width: 6, height: 6, background: "#A3A3A3", borderRadius: "50%", animation: "bounce 1s infinite 0ms" }} />
                <Box style={{ width: 6, height: 6, background: "#A3A3A3", borderRadius: "50%", animation: "bounce 1s infinite 150ms" }} />
                <Box style={{ width: 6, height: 6, background: "#A3A3A3", borderRadius: "50%", animation: "bounce 1s infinite 300ms" }} />
              </Box>
            </Box>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box className="border-t border-[var(--color-border)]" p={12} style={{ background: "var(--color-bg-muted)" }}>
        <Group gap={8}>
          <TextInput
            value={inputValue}
            onChange={(e) => setInputValue(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("inputPlaceholder")}
            size="xs"
            style={{ flex: 1 }}
            disabled={isTyping}
          />
          <ActionIcon
            size="md"
            onClick={() => void handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isTyping}
            style={{
              background: inputValue.trim() && !isTyping ? "#E85D3D" : "#E5E5E5",
              color: inputValue.trim() && !isTyping ? "white" : "#A3A3A3",
            }}
          >
            <IconSend size={14} />
          </ActionIcon>
        </Group>
        <Box mt={8} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {exampleQuestions.map((q) => (
            <UnstyledButton
              key={q}
              onClick={() => void handleSendMessage(t(`examples.${q}`))}
              style={{ fontSize: 11, color: "#737373", textAlign: "left", padding: "2px 0" }}
              className="hover:text-[#E85D3D]"
            >
              &ldquo;{t(`examples.${q}`)}&rdquo;
            </UnstyledButton>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
