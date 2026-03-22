"use client";

import * as React from "react";
import { Info, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  getTaxComponents,
  type TaxComponentInfo,
} from "@/lib/api/services/purchase-orders.service";

interface TaxInfoPopoverProps {
  documentNo: string;
  lineNo: number;
}

export function TaxInfoPopover({ documentNo, lineNo }: TaxInfoPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [data, setData] = React.useState<TaxComponentInfo[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && data.length === 0) {
      setLoading(true);
      setError(null);
      try {
        const res = await getTaxComponents(documentNo, lineNo);
        setData(res);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load tax info",
        );
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-muted h-6 w-6 p-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="text-muted-foreground h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 gap-0 p-0"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-muted/50 border-border rounded-t-md border-b px-3 py-2">
          <h4 className="text-md mx-auto w-max font-extrabold">
            Tax Information
          </h4>
        </div>
        <div className="">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="text-muted-foreground mr-2 h-5 w-5 animate-spin" />
              <span className="text-muted-foreground text-sm">Loading...</span>
            </div>
          ) : error ? (
            <div className="px-3 py-4 text-center text-sm text-red-500">
              {error}
            </div>
          ) : data.length === 0 ? (
            <div className="text-muted-foreground px-3 py-4 text-center text-sm">
              No tax information available
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-muted-foreground/30 border-b-2 hover:bg-transparent">
                  <TableHead className="text-foreground h-9 px-3 text-xs font-bold">
                    Component
                  </TableHead>
                  <TableHead className="text-foreground h-9 px-3 text-right text-xs font-bold">
                    Percentage
                  </TableHead>
                  <TableHead className="text-foreground h-9 px-3 text-right text-xs font-bold">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((tax, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/30">
                    <TableCell className="px-3 py-2 text-xs">
                      {tax.Component}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right text-xs">
                      {tax.Percent}%
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right text-xs font-medium">
                      {tax.Amount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
