import Link from "next/link";
import type { NavGroup } from "../_lib/navigation";

export function DocsNavList({
  groups,
  currentPath,
  onItemClick,
}: {
  groups: NavGroup[];
  currentPath: string;
  onItemClick?: () => void;
}) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.title} className="mb-6">
          <h4 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {group.title}
          </h4>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = currentPath === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onItemClick}
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
    </>
  );
}
