"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { docsNav } from "../_lib/navigation";

export function DocsHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="flex w-full items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 lg:hidden"
              aria-label="Toggle menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {mobileOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="4" y1="8" x2="20" y2="8" />
                    <line x1="4" y1="16" x2="20" y2="16" />
                  </>
                )}
              </svg>
            </button>

            <Link href="/docs" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-sm font-bold text-zinc-900">
                C
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold">CLEAR</span>
                <span className="text-xs text-zinc-400">Docs</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-zinc-400 transition-colors hover:text-zinc-100"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="absolute left-0 top-16 h-[calc(100vh-4rem)] w-72 overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-4">
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
                          onClick={() => setMobileOpen(false)}
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
        </div>
      )}
    </>
  );
}
