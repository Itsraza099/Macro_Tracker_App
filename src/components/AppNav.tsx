"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, NotebookText, ChartColumn, Settings2 } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Today", Icon: House },
  { href: "/ledger", label: "Ledger", Icon: NotebookText },
  { href: "/trends", label: "Trends", Icon: ChartColumn },
  { href: "/settings", label: "Settings", Icon: Settings2 },
] as const;

export default function AppNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-56 flex-col border-r border-line bg-surface px-3 py-8">
        <Link href="/" className="px-3 mb-8 block">
          <span className="display text-[28px] text-ink">Macro</span>
          <span className="block eyebrow mt-1">Food journal</span>
        </Link>
        <nav className="flex flex-col gap-1" aria-label="Main">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 h-11 px-3 rounded-xl text-sm font-semibold transition-colors ${
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Phone: bottom tab bar */}
      <nav
        aria-label="Main"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex h-16 px-2">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                  active ? "text-brand" : "text-ink-3"
                }`}
              >
                <span
                  className={`flex items-center justify-center w-14 h-7 rounded-full transition-colors ${
                    active ? "bg-brand-soft" : ""
                  }`}
                >
                  <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
