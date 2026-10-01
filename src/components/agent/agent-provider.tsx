"use client";

/**
 * Shared state for the CLEAR Agent across the app: whether the Agent drawer
 * is open and which Thread is active. The drawer and the Agent page render
 * the same `Chat`, so a Thread continues in either place; the open/active
 * state survives navigation and reloads in sessionStorage, like the app's
 * other nav contexts.
 */

import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Chat, useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useFeatureEnabled } from "~/components/feature-flags-provider";
import { useOptionalTeam } from "~/providers/team-provider";
import { currentViewFor, type CurrentView } from "~/lib/agent-current-view";
import {
  isNavigateResult,
  navigateCallIds,
  restoreNavContexts,
  snapshotNavContexts,
  type BackEntry,
  type NavigateResult,
} from "~/lib/agent-navigation";
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
  /** Perform an Agent navigation once (later calls for the same tool call are no-ops). */
  applyNavigation: (toolCallId: string, result: NavigateResult) => void;
  /** Whether Back can still undo this navigation. */
  canGoBack: (toolCallId: string) => boolean;
  /** Restore the exact view from before this navigation. */
  goBack: (toolCallId: string) => void;
  /** Changes on every Back, so the page remounts and re-reads restored state. */
  viewKey: number;
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
  /** The Current view to send with a turn, read at send time; none when absent. */
  currentView?: () => CurrentView | undefined,
): Chat<UIMessage> {
  return new Chat<UIMessage>({
    id: threadId,
    messages,
    onFinish,
    transport: new DefaultChatTransport<UIMessage>({
      api: "/api/agent",
      // Only the newest message: the Agent loads the earlier turns itself.
      prepareSendMessagesRequest: ({ messages: all, id }) => {
        const view = currentView?.();
        return {
          body: { threadId: id, message: all[all.length - 1], ...(view ? { currentView: view } : {}) },
        };
      },
    }),
  });
}

export function AgentProvider({ children }: { children: ReactNode }) {
  const flagOn = useFeatureEnabled("agent");
  // V2 (agent_clear_data): send the Current view with each turn. Read
  // through a ref so chats built earlier see the flag's current value.
  const clearDataOn = useFeatureEnabled("agent_clear_data");
  const clearDataRef = useRef(clearDataOn);
  clearDataRef.current = clearDataOn;
  // The active team rides along, so Agent navigation checks scope the way
  // the pages do (against this team, not every team the user is in).
  const activeTeamId = useOptionalTeam()?.activeTeamId ?? null;
  const activeTeamRef = useRef(activeTeamId);
  activeTeamRef.current = activeTeamId;
  const readCurrentView = useCallback(
    () => (clearDataRef.current ? currentViewFor(window.location.pathname, activeTeamRef.current) : undefined),
    [],
  );
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
  const [chat, setChat] = useState(() => createAgentChat(state.threadId, undefined, onTurnFinished, readCurrentView));
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
      setChat(createAgentChat(saved.threadId, undefined, onTurnFinished, readCurrentView));
      setPendingLoad(saved.threadId);
    } else if (saved) {
      clearAgentSession();
    }
  }, [userId, onTurnFinished, readCurrentView]);

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
      const history = stored.data.messages as UIMessage[];
      for (const id of navigateCallIds(history)) applied.current.add(id);
      setChat(createAgentChat(pendingLoad, history, onTurnFinished, readCurrentView));
    }
    setPendingLoad(null);
  }, [pendingLoad, stored.isSuccess, stored.data, chat, onTurnFinished, readCurrentView]);

  // ── Agent navigation ───────────────────────────────────────────────────
  const router = useRouter();
  const [backStack, setBackStack] = useState<BackEntry[]>([]);
  const [viewKey, setViewKey] = useState(0);
  /**
   * Navigate tool calls already acted on, or history: every chat seeded with
   * stored turns registers their calls here before it is shown, so a loaded
   * Thread never replays a move.
   */
  const applied = useRef(new Set<string>());

  // Declared before the navigation callbacks that use it.
  const update = useCallback(
    (next: StoredAgentState) => {
      const owned = { ...next, ...(userId ? { userId } : {}) };
      setState(owned);
      writeStored(owned);
    },
    [userId],
  );

  const applyNavigation = useCallback(
    (toolCallId: string, result: NavigateResult) => {
      if (applied.current.has(toolCallId)) return;
      applied.current.add(toolCallId);
      const { pathname, search, hash } = window.location;
      setBackStack((stack) => [
        ...stack,
        { toolCallId, url: `${pathname}${search}${hash}`, snapshot: snapshotNavContexts() },
      ]);
      // Leaving the Agent page: carry the Thread into the drawer first, so
      // the conversation stays beside what the Agent just opened.
      if (pathname === "/agent") update({ ...state, open: true });
      router.push(result.url);
    },
    [router, state, update],
  );

  const canGoBack = useCallback(
    (toolCallId: string) => backStack.some((e) => e.toolCallId === toolCallId),
    [backStack],
  );

  const goBack = useCallback(
    (toolCallId: string) => {
      const index = backStack.findIndex((e) => e.toolCallId === toolCallId);
      if (index < 0) return;
      const entry = backStack[index]!;
      // This move and any made after it are undone together.
      setBackStack(backStack.slice(0, index));
      restoreNavContexts(entry.snapshot);
      // Remount the page: a page staying mounted across Back (Detection to
      // Detection) would otherwise keep the Agent's filters in its state and
      // write them over the restored ones.
      setViewKey((k) => k + 1);
      router.push(entry.url);
    },
    [backStack, router],
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
      for (const id of navigateCallIds(messages ?? [])) applied.current.add(id);
      setChat(createAgentChat(threadId, messages, onTurnFinished, readCurrentView));
      setPendingLoad(messages ? null : threadId);
    },
    [state, update, onTurnFinished, readCurrentView],
  );

  const newThread = useCallback(() => {
    const threadId = crypto.randomUUID();
    update({ ...state, threadId });
    setChat(createAgentChat(threadId, undefined, onTurnFinished, readCurrentView));
    setPendingLoad(null);
  }, [state, update, onTurnFinished, readCurrentView]);

  const value = useMemo<AgentContextValue>(
    () => ({
      available,
      open: available && state.open,
      setOpen,
      threadId: state.threadId,
      chat,
      openThread,
      newThread,
      applyNavigation,
      canGoBack,
      goBack,
      viewKey,
    }),
    [available, state, setOpen, chat, openThread, newThread, applyNavigation, canGoBack, goBack, viewKey],
  );

  return (
    <AgentContext.Provider value={value}>
      {available && (
        <NavigationWatcher chat={chat} apply={applyNavigation} />
      )}
      {children}
    </AgentContext.Provider>
  );
}

/**
 * Acts on Agent navigation as results stream in, whether or not a Thread is
 * on screen (the drawer unmounts its content when closed, and the Agent page
 * when the user leaves it).
 */
function NavigationWatcher({
  chat,
  apply,
}: {
  chat: Chat<UIMessage>;
  apply: (toolCallId: string, result: NavigateResult) => void;
}) {
  const { messages } = useChat({ chat });
  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts as Array<{ type: string; toolCallId?: string; state?: string; output?: unknown }>) {
        if (
          part.type === "tool-navigate" &&
          part.toolCallId &&
          part.state === "output-available" &&
          isNavigateResult(part.output)
        ) {
          apply(part.toolCallId, part.output);
        }
      }
    }
  }, [messages, apply]);
  return null;
}

/** The page, remounted when the user goes Back from an Agent navigation. */
export function AgentViewBoundary({ children }: { children: ReactNode }) {
  const agent = useContext(AgentContext);
  return <Fragment key={agent?.viewKey ?? 0}>{children}</Fragment>;
}

/** The Agent context, or null outside an AgentProvider (e.g. isolated tests). */
export function useOptionalAgent(): AgentContextValue | null {
  return useContext(AgentContext);
}

export function useAgent(): AgentContextValue {
  const value = useContext(AgentContext);
  if (!value) throw new Error("useAgent must be used inside <AgentProvider>");
  return value;
}
