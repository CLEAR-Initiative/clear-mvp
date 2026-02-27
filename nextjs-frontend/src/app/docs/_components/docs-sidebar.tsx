"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { docsNav } from "../_lib/navigation";

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 overflow-y-auto border-r border-zinc-800 bg-zinc-950 pb-10 pt-16 lg:block">
      <nav className="px-4 pt-6">
        {docsNav.map((group) => (
          <div key={group.title} className="mb-6">
            <h4 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {group.title}
            </h4>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${
                        isActive
                          ? "bg-zinc-100/10 font-medium text-zinc-100"
                          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                      }`}
                    >
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
