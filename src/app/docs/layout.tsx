import type { ReactNode } from "react";
import { DocsHeader } from "./_components/docs-header";
import { DocsSidebar } from "./_components/docs-sidebar";
import { DocsToc } from "./_components/docs-toc";

export const metadata = {
  title: "Documentation — CLEAR",
  description:
    "Learn how to use CLEAR, the humanitarian decision-support platform for crisis response.",
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <DocsHeader />
      <DocsSidebar />

      <main className="pt-16 lg:pl-64 xl:pr-56">
        <div className="mx-auto max-w-3xl px-6 py-10 lg:px-8">
          {children}
        </div>
      </main>

      <DocsToc />
    </div>
  );
}
