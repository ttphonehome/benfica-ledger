import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-[200px] min-w-0 border border-input bg-transparent px-2.5 font-mono text-xs text-foreground placeholder:text-mute outline-none focus-visible:ring-2 focus-visible:ring-ring touch:h-11 touch:text-base",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
