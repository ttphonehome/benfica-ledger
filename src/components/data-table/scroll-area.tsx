"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Horizontal scroller for wide tables. The scrollbar is hidden (as in the
// reference), so a fade on the right edge shows there is more to see.
// Exposes the visible width as --scroll-w so expanded rows can stay on screen.
export function ScrollArea({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      el.style.setProperty("--scroll-w", `${el.clientWidth}px`);
      setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <div className="relative">
      <div ref={ref} className={cn("no-scrollbar overflow-x-auto overflow-y-hidden", className)}>
        {children}
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent transition-opacity",
          more ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
