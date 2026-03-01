"use client";

import { usePathname } from "next/navigation";
import { docsNav } from "../_lib/navigation";
import { DocsNavList } from "./docs-nav-list";

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 overflow-y-auto border-r border-zinc-800 bg-zinc-950 pb-10 pt-16 lg:block">
      <nav className="px-4 pt-6">
        <DocsNavList groups={docsNav} currentPath={pathname} />
      </nav>
    </aside>
  );
}
