import type { ReactNode } from "react";

export function DocsPage({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <article data-docs-content className="prose prose-invert max-w-none">
      <div className="not-prose mb-8">
        {badge && (
          <span className="mb-2 inline-block rounded-full bg-zinc-100/10 px-3 py-1 text-xs font-medium text-zinc-100">
            {badge}
          </span>
        )}
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-lg text-zinc-400">{description}</p>
        <hr className="mt-6 border-zinc-800" />
      </div>
      {children}
    </article>
  );
}

export function DocsH2({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <h2 id={id} className="scroll-mt-24">
      {children}
    </h2>
  );
}

export function DocsH3({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <h3 id={id} className="scroll-mt-24">
      {children}
    </h3>
  );
}

export function InfoBox({
  type = "info",
  children,
}: {
  type?: "info" | "warning" | "tip";
  children: ReactNode;
}) {
  const styles = {
    info: "border-blue-500/30 bg-blue-500/5 text-blue-300",
    warning: "border-amber-500/30 bg-amber-500/5 text-amber-300",
    tip: "border-green-500/30 bg-green-500/5 text-green-300",
  };

  const labels = { info: "Note", warning: "Warning", tip: "Tip" };

  return (
    <div
      className={`not-prose my-4 rounded-lg border-l-4 p-4 text-sm ${styles[type]}`}
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider">
        {labels[type]}
      </p>
      <div>{children}</div>
    </div>
  );
}
