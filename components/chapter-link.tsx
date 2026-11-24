"use client";

import type { ReactNode } from "react";
import { useLenis } from "lenis/react";

/** The part of the Lenis instance the chapter jumps use. */
type Scroller = { scrollTo: (target: HTMLElement | number, options?: { offset?: number }) => void } | undefined;

/** Height of the sticky site header (h-14) plus a small gap. */
const HEADER_GAP = 56 + 8;

/**
 * Scrolls to one story chapter so its heading lands just under the pinned plan.
 * Uses lenis.scrollTo when the smooth root is mounted; otherwise the browser scroll,
 * instant under reduced motion. Returns false when the chapter is not on the page.
 */
export function scrollToChapter(lenis: Scroller, chapter: string): boolean {
  const el = document.getElementById(`chapter-${chapter}`);
  if (!el) return false;
  const pin = document.getElementById("story-pin");
  const offset = -((pin?.offsetHeight ?? 0) + HEADER_GAP);
  if (lenis) {
    lenis.scrollTo(el, { offset });
  } else {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: reduce ? "auto" : "smooth" });
  }
  return true;
}

/**
 * An in-page link to a story chapter. Without JavaScript it is a plain anchor (the chapter
 * carries a scroll margin for that case); with JavaScript it scrolls through Lenis.
 */
export function ChapterLink({ chapter, className, children }: { chapter: string; className?: string; children: ReactNode }) {
  const lenis = useLenis();
  return (
    <a
      href={`#chapter-${chapter}`}
      className={className}
      onClick={(e) => {
        if (scrollToChapter(lenis, chapter)) e.preventDefault();
      }}
    >
      {children}
    </a>
  );
}
