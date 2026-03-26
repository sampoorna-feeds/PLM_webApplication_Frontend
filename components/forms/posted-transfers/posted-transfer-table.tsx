"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface Column {
  id: string;
  label: string;
}

const columns: Column[] = [
  { id: "No", label: "No." },
  { id: "Posting_Date", label: "Posting Date" },
  { id: "Transfer_from_Code", label: "From Location" },
  { id: "Transfer_to_Code", label: "To Location" },
  { id: "Vehicle_No", label: "Vehicle No." },
];

interface PostedTransferTableProps {
  data: any[];
  isLoading: boolean;
  onRowClick?: (id: string) => void;
}

export function PostedTransferTable({ data, isLoading, onRowClick }: PostedTransferTableProps) {
  return (
    <div className="bg-card flex h-full flex-1 flex-col overflow-hidden rounded-lg border shadow-sm">
      <div className="flex-1 overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="bg-muted sticky top-0 z-10 border-b">
            <tr>
              <th className="text-foreground h-10 w-12 px-3 py-3 text-center align-middle text-xs font-bold whitespace-nowrap">
                S.No
              </th>
              {columns.map((col) => (
                <th key={col.id} className="text-foreground h-10 px-3 py-3 text-left align-middle text-xs font-bold whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="p-3 text-center"><Skeleton className="h-4 w-4 mx-auto" /></td>
                  {columns.map(col => (
                    <td key={col.id} className="p-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="h-32 text-center text-muted-foreground">
                  No data found for the selected filters.
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={row.No}
                  className={`border-b transition-colors ${onRowClick ? "hover:bg-muted cursor-pointer" : ""}`}
                  onClick={() => onRowClick?.(row.No)}
                >
                  <td className="text-muted-foreground p-3 text-center text-xs whitespace-nowrap">
                    {index + 1}
                  </td>
                  {columns.map(col => (
                    <td key={col.id} className="p-3 text-xs whitespace-nowrap">
                      {formatValue(row[col.id], col.id)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatValue(value: any, columnId: string) {
  if (value === null || value === undefined || value === "") return "-";
  
  if (columnId === "Posting_Date" && typeof value === "string" && value !== "0001-01-01") {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) return date.toLocaleDateString();
    } catch { /* ignore */ }
  }
  
  return String(value);
}
