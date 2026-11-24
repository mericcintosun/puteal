"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Story" },
  { href: "/play", label: "Planner" },
  { href: "/notes", label: "Method notes" },
];

const PANEL_ID = "site-nav-panel";

// HEADER row: solid ground, border-b in LINE, sticky. Below md the three links sit in a
// disclosure panel under the bar; from md up they are the inline list.
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // Close the panel whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes the panel too.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="puteal-noprint sticky top-0 z-40 h-14 border-b border-border bg-background">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="flex min-h-11 items-center gap-2">
          <BrandMark />
          <span className="font-display text-lg font-semibold tracking-tight">Puteal</span>
        </Link>
        <nav aria-label="Primary" className="hidden md:flex">
          <ul className="flex items-center gap-1 text-sm">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-md border-b-2 px-2.5 transition-colors",
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
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border border-t-edge bg-card text-foreground md:hidden"
          aria-expanded={open}
          aria-controls={PANEL_ID}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        </button>
      </div>
      <nav
        id={PANEL_ID}
        aria-label="Primary, small screens"
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-border bg-background md:hidden"
      >
        <ul className="mx-auto flex max-w-6xl flex-col px-5 py-2 text-base">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex min-h-11 items-center border-l-2 pl-3 transition-colors",
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
    </header>
  );
}
