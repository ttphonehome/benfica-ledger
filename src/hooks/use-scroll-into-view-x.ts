"use client";

import { useEffect, useRef } from "react";

// Horizontally centres the ref'd element inside its ScrollArea when `key`
// changes, without moving the page vertically. No-op when nothing overflows.
export function useScrollIntoViewX<T extends Element>(key: unknown) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    const scroller = el?.closest<HTMLElement>("[data-scroll-area]");
    if (!el || !scroller || scroller.scrollWidth <= scroller.clientWidth) return;
    const box = el.getBoundingClientRect();
    const frame = scroller.getBoundingClientRect();
    scroller.scrollLeft += box.left + box.width / 2 - (frame.left + frame.width / 2);
  }, [key]);
  return ref;
}
