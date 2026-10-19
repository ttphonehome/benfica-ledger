import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// The reference's "tag": small mono uppercase chip with a 1px border.
const badgeVariants = cva(
  "inline-block border px-[7px] py-[2px] font-mono text-[9.5px] uppercase leading-[1.5] tracking-[0.08em] whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-rule-strong text-mute",
        academy: "border-good bg-good-soft text-good",
        sold: "border-rule-strong text-foreground",
        loan: "border-warn bg-warn-soft text-warn",
        injured: "border-bad bg-bad-soft text-bad",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
