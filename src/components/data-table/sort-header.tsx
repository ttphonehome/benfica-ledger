import type { Column } from "@tanstack/react-table";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// A sortable column header. The whole cell is the button, so it is a full
// 44px target on touch screens.
export function SortHead<T>({
  column,
  label,
  right,
}: {
  column: Column<T, unknown>;
  label: string;
  right?: boolean;
}) {
  const dir = column.getIsSorted();
  if (!column.getCanSort()) {
    return <TableHead className={cn(right && "text-right")}>{label}</TableHead>;
  }
  return (
    <TableHead
      className="p-0"
      aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
    >
      <button
        type="button"
        onClick={column.getToggleSortingHandler()}
        className={cn(
          "flex w-full items-center px-3.5 py-3 font-mono text-[10px] font-bold tracking-[0.1em] uppercase hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset touch:min-h-11",
          right && "justify-end",
          dir && "text-foreground",
        )}
      >
        {label}
        <span aria-hidden className="ml-1 inline-block w-2 text-[9px] text-mute-2">
          {dir === "asc" ? "▲" : dir === "desc" ? "▼" : ""}
        </span>
      </button>
    </TableHead>
  );
}
