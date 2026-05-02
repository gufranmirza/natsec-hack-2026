'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';

import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  isSelected?: (row: T) => boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  initialSort?: SortingState;
}

// Generic data table: fixed sticky header, ScrollArea body, hover rows,
// columnResizeMode onChange, sortable headers.
export function DataTable<T>({
  columns,
  data,
  onRowClick,
  isSelected,
  isLoading = false,
  emptyMessage = 'No results',
  initialSort,
}: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSort ?? []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
    state: { sorting },
  });

  return (
    <div className="surface-card flex h-full flex-col overflow-hidden rounded-[var(--radius)] border">
      {/* Fixed header — soft tinted strip with a 1px shadow below
       * for a subtle "elevated above the body" feel. The shadow is
       * the trick that makes scrolling feel premium: when you
       * scroll, the row content slides under the header rather than
       * appearing to butt against it. */}
      <div className="bg-muted/40 border-border relative border-b shadow-[0_1px_0_0_hsl(240_6%_94%)]">
        <Table className="w-full table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow
                key={hg.id}
                className="border-border/0 hover:bg-transparent"
              >
                {hg.headers.map((h) => (
                  <TableHead
                    key={h.id}
                    // Header type rules: 12px medium, sentence/Title
                    // case as-written. No uppercase + no expanded
                    // tracking — those belong on section labels, not
                    // on table headers where they read as shouting.
                    // text-muted-foreground keeps the header quiet
                    // — it's wayfinding, not the data.
                    className="text-muted-foreground h-11 px-4 text-xs font-medium"
                    style={{
                      width: h.getSize(),
                      minWidth: h.getSize(),
                    }}
                  >
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
        </Table>
      </div>

      {/* Scrollable body — hairline row dividers, gentle hover. */}
      <ScrollArea className="flex-1">
        <Table className="w-full table-fixed">
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground py-16 text-center text-sm"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground py-16 text-center text-sm"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const selected = isSelected?.(row.original) ?? false;
                return (
                  <TableRow
                    key={row.id}
                    className={`hairline border-b transition-colors ${
                      onRowClick ? 'hover:bg-muted/30 cursor-pointer' : ''
                    } ${selected ? 'bg-accent/40' : ''}`}
                    onClick={
                      onRowClick ? () => onRowClick(row.original) : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="px-4 py-3"
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
