import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Pencil, Trash2 } from "lucide-react";

export default function DataTable({ columns, data = [], isLoading, onEdit, onDelete, searchKeys = [], emptyMessage = "Nenhum registro encontrado" }) {
  const [search, setSearch] = useState("");

  const filtered = data.filter(row => {
    if (!search) return true;
    const s = search.toLowerCase();
    return searchKeys.some(key => String(row[key] || "").toLowerCase().includes(s));
  });

  return (
    <Card className="border border-border overflow-hidden">
      <div className="p-3 border-b border-border bg-muted/30">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2">
          {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                {columns.map(col => (
                  <TableHead key={col.key} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground py-2.5">
                    {col.label}
                  </TableHead>
                ))}
                {(onEdit || onDelete) && (
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground py-2.5 w-20">Ações</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center py-10 text-muted-foreground text-sm">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : filtered.map((row, idx) => (
                <TableRow key={row.id || idx} className="hover:bg-muted/20 transition-colors">
                  {columns.map(col => (
                    <TableCell key={col.key} className="py-2.5 text-sm">
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "—")}
                    </TableCell>
                  ))}
                  {(onEdit || onDelete) && (
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-1">
                        {onEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(row)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(row)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}