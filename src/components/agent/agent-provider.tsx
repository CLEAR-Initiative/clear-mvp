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
  useRef,
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
  /** Whose Thread this is: never restored for anyone else on the same tab. */
  userId?: string;
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
    return {
      open: parsed.open === true,
      threadId: parsed.threadId,
      ...(typeof parsed.userId === "string" ? { userId: parsed.userId } : {}),
    };
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

/** Forget the drawer state, e.g. on sign-out on a shared device. */
export function clearAgentSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

export function createAgentChat(
  threadId: string,
  messages?: UIMessage[],
  onFinish?: () => void,
): Chat<UIMessage> {
  return new Chat<UIMessage>({
    id: threadId,
    messages,
    onFinish,
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
  const userId = me.data?.user?.id;

  const utils = api.useUtils();
  // A finished turn changes the Thread's place in the history list and its
  // stored turns.
  const onTurnFinished = useCallback(() => {
    void utils.agent.listConversations.invalidate();
    void utils.agent.getConversation.invalidate();
  }, [utils]);

  const [state, setState] = useState<StoredAgentState>(() => ({
    open: false,
    threadId: crypto.randomUUID(),
  }));
  const [chat, setChat] = useState(() => createAgentChat(state.threadId, undefined, onTurnFinished));
  /** A Thread whose stored turns still have to be loaded into its chat. */
  const [pendingLoad, setPendingLoad] = useState<string | null>(null);

  // Restore once the user is known (after mount, so server and client render
  // the same first frame), and only their own Thread: a tab outlives a
  // sign-out on a shared device.
  const restored = useRef(false);
  useEffect(() => {
    if (!userId || restored.current) return;
    restored.current = true;
    const saved = readStored();
    if (saved?.userId === userId) {
      setState(saved);
      setChat(createAgentChat(saved.threadId, undefined, onTurnFinished));
      setPendingLoad(saved.threadId);
    } else if (saved) {
      clearAgentSession();
    }
  }, [userId, onTurnFinished]);

  const stored = api.agent.getConversation.useQuery(
    { id: pendingLoad ?? "" },
    // Always fresh: a cached copy would miss the Thread's latest turns.
    { enabled: available && pendingLoad !== null, staleTime: 0, gcTime: 0, retry: false },
  );
  useEffect(() => {
    if (!pendingLoad || !stored.isSuccess || stored.data?.id !== pendingLoad) {
      if (stored.isSuccess && !stored.data) setPendingLoad(null); // a new Thread
      return;
    }
    // Seed only a chat nobody has typed into yet.
    if (chat.id === pendingLoad && chat.messages.length === 0) {
      setChat(createAgentChat(pendingLoad, stored.data.messages as UIMessage[], onTurnFinished));
    }
    setPendingLoad(null);
  }, [pendingLoad, stored.isSuccess, stored.data, chat, onTurnFinished]);

  const update = useCallback(
    (next: StoredAgentState) => {
      const owned = { ...next, ...(userId ? { userId } : {}) };
      setState(owned);
      writeStored(owned);
    },
    [userId],
  );

  const setOpen = useCallback(
    (open: boolean) => update({ ...state, open }),
    [state, update],
  );

  const openThread = useCallback(
    (threadId: string, messages?: UIMessage[]) => {
      // Re-opening the active Thread would orphan a stream in progress.
      if (threadId === state.threadId) return;
      update({ ...state, threadId });
      setChat(createAgentChat(threadId, messages, onTurnFinished));
      setPendingLoad(messages ? null : threadId);
    },
    [state, update, onTurnFinished],
  );

  const newThread = useCallback(() => {
    const threadId = crypto.randomUUID();
    update({ ...state, threadId });
    setChat(createAgentChat(threadId, undefined, onTurnFinished));
    setPendingLoad(null);
  }, [state, update, onTurnFinished]);

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
