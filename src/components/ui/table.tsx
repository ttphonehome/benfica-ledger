import * as React from "react";
import { cn } from "@/lib/utils";

// shadcn's table primitives, styled as the reference's table.data. The
// scrolling wrapper lives in components/data-table/scroll-area.tsx.

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return <table data-slot="table" className={cn("w-full border-collapse text-[13px]", className)} {...props} />;
}

function TableHeader(props: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn("[&>tr:last-child]:border-b-0", className)} {...props} />;
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("border-b border-border transition-colors duration-75 data-[state=selected]:bg-paper-2", className)}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "border-b border-border bg-paper-2 px-3.5 py-3 text-left font-mono text-[10px] font-bold tracking-[0.1em] whitespace-nowrap text-mute uppercase",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td data-slot="table-cell" className={cn("h-(--row-h) px-3.5 align-middle whitespace-nowrap", className)} {...props} />
  );
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow };
