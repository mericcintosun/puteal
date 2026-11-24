"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Story" },
  { href: "/play", label: "Planner" },
  { href: "/notes", label: "Method notes" },
];

// HEADER row: solid ground, border-b in LINE, sticky.
export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="puteal-noprint sticky top-0 z-40 h-14 border-b border-border bg-background">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark />
          <span className="font-display text-lg font-semibold tracking-tight">Puteal</span>
        </Link>
        <nav aria-label="Primary">
          <ul className="flex items-center gap-1 text-sm">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-md border-b-2 px-2.5 py-1.5 transition-colors",
                      active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
