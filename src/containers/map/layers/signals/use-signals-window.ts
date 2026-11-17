import { useState } from "react";

const WINDOW_DAYS = 30;

export function signalsWindow(now: Date): { from: string; to: string } {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - WINDOW_DAYS);
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function useSignalsWindow(): { from: string; to: string } {
  const [range] = useState(() => signalsWindow(new Date()));
  return range;
}
