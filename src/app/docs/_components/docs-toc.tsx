"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function DocsToc() {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const pathname = usePathname();

  useEffect(() => {
    const article = document.querySelector("[data-docs-content]");
    if (!article) return;

    const elements = article.querySelectorAll("h2, h3");
    const items: TocItem[] = Array.from(elements).map((el) => ({
      id: el.id,
      text: el.textContent ?? "",
      level: el.tagName === "H2" ? 2 : 3,
    }));
    setHeadings(items);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -80% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  if (headings.length === 0) return null;

  return (
    <aside className="fixed right-0 top-0 z-30 hidden h-screen w-56 overflow-y-auto pb-10 pt-16 xl:block">
      <div className="px-4 pt-6">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          On this page
        </h4>
        <ul className="space-y-1">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className={`block text-xs leading-relaxed transition-colors ${
                  heading.level === 3 ? "pl-3" : ""
                } ${
                  activeId === heading.id
                    ? "font-medium text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
