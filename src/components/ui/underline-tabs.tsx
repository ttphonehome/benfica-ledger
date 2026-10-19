"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

// Underlined tab strip (".tab-strip"), built on the same Radix Tabs as ui/tabs.
export function UnderlineTabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("no-scrollbar mb-[22px] flex overflow-x-auto border-b border-border", className)}
      {...props}
    />
  );
}

export function UnderlineTabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "-mb-px border-b-2 border-transparent px-4 pt-3 pb-2.5 text-[13px] tracking-[-0.005em] whitespace-nowrap text-mute outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-[state=active]:border-primary data-[state=active]:font-medium data-[state=active]:text-foreground touch:min-h-11",
        className,
      )}
      {...props}
    />
  );
}
