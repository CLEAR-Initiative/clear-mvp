import { useState } from "react";

const WINDOW_DAYS = 30;

export function signalsWindow(now: Date): { from: string } {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - WINDOW_DAYS);
  return { from: from.toISOString() };
}

export function useSignalsWindow(): { from: string } {
  const [range] = useState(() => signalsWindow(new Date()));
  return range;
}
