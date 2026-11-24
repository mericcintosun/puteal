"use client";

import { useEffect, useState } from "react";
import { ReactLenis } from "lenis/react";

/**
 * Kit K3, signature 1 (part one): the Lenis smooth-scrolling root.
 * Mounted beside the page (not around it) so the page never remounts, and never mounted
 * when the reader asks for reduced motion. Components reach it through useLenis().
 */
export function SmoothScroll() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!enabled) return null;
  return <ReactLenis root options={{ lerp: 0.12 }}>{null}</ReactLenis>;
}
