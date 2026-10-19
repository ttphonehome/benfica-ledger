"use client";

import { useMemo, useState } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { fmtMoney } from "@/lib/format";
import type { AuditRow } from "@/lib/stats/audit";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SortHead } from "@/components/data-table/sort-header";
import { localeText } from "@/components/data-table/sorting";
import { ScrollArea } from "@/components/data-table/scroll-area";
import { Faint, PosTag, RatingChip } from "@/components/common/cells";
import { cn } from "@/lib/utils";

const col = createColumnHelper<AuditRow>();

function feeText(r: AuditRow) {
  if (r.type === "free") return "Free";
  if (r.type === "loan-in" || r.type === "loan-out") return "Loan";
  if (r.type === "academy-promo") return "Academy";
  if (r.type === "loan-end") return "Loan ended";
  return fmtMoney(r.fee);
}

const VERDICT_LABEL = { good: "Value created", bad: "Value destroyed", neutral: "No verdict" } as const;

export function AuditTable({ rows, kind }: { rows: AuditRow[]; kind: "in" | "out" }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "fee", desc: true }]);
  const columns = useMemo(() => [
    col.accessor("player", { header: "Player", sortingFn: localeText }),
    col.accessor("pos", { header: "Pos", sortingFn: localeText }),
    ...(kind === "in"
      ? [col.accessor((r) => r.age ?? undefined, { id: "age", header: "Age", sortUndefined: "last" as const, meta: { right: true } })]
      : []),
    col.accessor((r) => r.apps ?? undefined, { id: "apps", header: "Apps", sortUndefined: "last", meta: { right: true } }),
    col.accessor((r) => r.rating ?? undefined, { id: "rating", header: "Rating", sortUndefined: "last", meta: { right: true } }),
    col.accessor((r) => r.fee ?? undefined, { id: "fee", header: "Fee", sortUndefined: "last", meta: { right: true } }),
    col.accessor("club", { header: kind === "in" ? "From" : "To", sortingFn: localeText }),
  ], [kind]);

  // TanStack's table object isn't memoizable; React Compiler skips this component, which is fine here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (r) => r.id,
    sortDescFirst: true,
    enableSortingRemoval: false,
    autoResetAll: false,
  });

  const num = "tnum text-right font-mono text-[12.5px]";
  return (
    <ScrollArea>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <SortHead
                  key={h.id}
                  column={h.column}
                  label={String(h.column.columnDef.header)}
                  right={(h.column.columnDef.meta as { right?: boolean } | undefined)?.right}
                  className="bg-transparent"
                />
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map(({ original: r }) => (
            <TableRow key={r.id} className="hover:bg-paper-2">
              <TableCell className="text-sm font-medium tracking-[-0.012em]">
                <span
                  role="img"
                  aria-label={VERDICT_LABEL[r.verdict]}
                  title={VERDICT_LABEL[r.verdict]}
                  className={cn(
                    "mr-1.5 inline-block size-[7px] rounded-full align-[1px]",
                    r.verdict === "good" && "bg-good",
                    r.verdict === "bad" && "bg-bad",
                    r.verdict === "neutral" && "bg-mute-2",
                  )}
                />
                {r.player}
              </TableCell>
              <TableCell>
                <PosTag pos={r.pos} />
              </TableCell>
              {kind === "in" && <TableCell className={num}>{r.age ?? <Faint />}</TableCell>}
              <TableCell className={num}>{r.apps || <Faint />}</TableCell>
              <TableCell className="text-right" title={r.statsSeason && r.statsSeason !== r.season ? `From ${r.statsSeason}` : undefined}>
                <RatingChip r={r.rating} />
              </TableCell>
              <TableCell className={cn(num, kind === "out" ? "text-good" : "text-bad")}>{feeText(r)}</TableCell>
              <TableCell className="max-w-40 truncate font-mono text-[12.5px] text-mute">{r.club}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="p-8 text-center text-mute">
                No moves this window.
              </td>
            </tr>
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

