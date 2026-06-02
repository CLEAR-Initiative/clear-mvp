import type { ReactNode } from "react";

/** Mono uppercase section header with a trailing rule. */
export function SecHead({ children }: { children: ReactNode }) {
  return (
    <div className="sec-head">
      <span>{children}</span>
      <span className="rule" />
    </div>
  );
}
