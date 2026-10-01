"use client";

/**
 * Shared state for the CLEAR Agent across the app: whether the Agent drawer
 * is open and which Thread is active. The drawer and the Agent page render
 * the same `Chat`, so a Thread continues in either place; the open/active
 * state survives navigation and reloads in sessionStorage, like the app's
 * other nav contexts.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useFeatureEnabled } from "~/components/feature-flags-provider";
import { canReadContent } from "~/lib/roles";
import { api } from "~/trpc/react";

const STORAGE_KEY = "agent-drawer";

interface StoredAgentState {
  open: boolean;
  threadId: string;
}

export interface AgentContextValue {
  /** Feature flag on and the user is approved to read content. */
  available: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  threadId: string;
  /** The active Thread's chat, shared by the drawer and the Agent page. */
  chat: Chat<UIMessage>;
  /** Switch to an existing Thread, optionally seeding its stored turns. */
  openThread: (threadId: string, messages?: UIMessage[]) => void;
  /** Start a fresh Thread. */
  newThread: () => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

function readStored(): StoredAgentState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredAgentState>;
    if (typeof parsed.threadId !== "string" || !parsed.threadId) return null;
    return { open: parsed.open === true, threadId: parsed.threadId };
  } catch {
    return null;
  }
}

function writeStored(state: StoredAgentState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota */
  }
}

export function createAgentChat(threadId: string, messages?: UIMessage[]): Chat<UIMessage> {
  return new Chat<UIMessage>({
    id: threadId,
    messages,
    transport: new DefaultChatTransport<UIMessage>({
      api: "/api/agent",
      // Only the newest message: the Agent loads the earlier turns itself.
      prepareSendMessagesRequest: ({ messages: all, id }) => ({
        body: { threadId: id, message: all[all.length - 1] },
      }),
    }),
  });
}

export function AgentProvider({ children }: { children: ReactNode }) {
  const flagOn = useFeatureEnabled("agent");
  const me = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const available = flagOn && canReadContent(me.data?.user?.role);

  const [state, setState] = useState<StoredAgentState>(() => ({
    open: false,
    threadId: crypto.randomUUID(),
  }));
  const [chat, setChat] = useState(() => createAgentChat(state.threadId));

  // Restore after mount so server and client render the same first frame.
  useEffect(() => {
    const stored = readStored();
    if (stored) {
      setState(stored);
      setChat(createAgentChat(stored.threadId));
    }
  }, []);

  const update = useCallback((next: StoredAgentState) => {
    setState(next);
    writeStored(next);
  }, []);

  const setOpen = useCallback(
    (open: boolean) => update({ ...state, open }),
    [state, update],
  );

  const openThread = useCallback(
    (threadId: string, messages?: UIMessage[]) => {
      update({ ...state, threadId });
      setChat(createAgentChat(threadId, messages));
    },
    [state, update],
  );

  const newThread = useCallback(() => {
    openThread(crypto.randomUUID());
  }, [openThread]);

  const value = useMemo<AgentContextValue>(
    () => ({
      available,
      open: available && state.open,
      setOpen,
      threadId: state.threadId,
      chat,
      openThread,
      newThread,
    }),
    [available, state, setOpen, chat, openThread, newThread],
  );

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent(): AgentContextValue {
  const value = useContext(AgentContext);
  if (!value) throw new Error("useAgent must be used inside <AgentProvider>");
  return value;
}
