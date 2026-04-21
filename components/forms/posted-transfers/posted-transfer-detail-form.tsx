"use client";

import { useEffect, useState } from "react";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import {
  getPostedTransferShipmentByNo,
  getTransferReceiptByNo,
  getPostedTransferShipmentLines,
  getTransferReceiptLines,
} from "@/lib/api/services/transfer-orders.service";
import { 
  generateEInvoice, 
  cancelEInvoice, 
  generateEWayBill, 
  cancelEWayBill, 
  updateVehicle, 
  updateTransporter 
} from "@/lib/api/services/eway-einvoice.service";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface PostedTransferDetailFormProps {
  tabId: string;
  formData?: Record<string, any>;
  context?: Record<string, any>;
  type?: "shipment" | "receipt";
  no?: string;
}

export function PostedTransferDetailForm({
  tabId,
  formData,
  context,
  type: propType,
  no: propNo,
}: PostedTransferDetailFormProps) {
  const { currentTab } = useFormStackContext();
  const activeNo = propNo || context?.no || currentTab?.context?.no;
  const type = propType || context?.type || currentTab?.context?.type || "shipment";

  const [header, setHeader] = useState<any | null>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (actionName: string, fn: () => Promise<void>) => {
    try {
      setActionLoading(actionName);
      await fn();
      toast.success(`${actionName} completed successfully`);
    } catch (err: any) {
      toast.error(err.message || `Failed to ${actionName.toLowerCase()}`);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (!activeNo) return;

    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [headerData, linesData] = await Promise.all([
          type === "shipment" 
            ? getPostedTransferShipmentByNo(activeNo) 
            : getTransferReceiptByNo(activeNo),
          type === "shipment"
            ? getPostedTransferShipmentLines(activeNo)
            : getTransferReceiptLines(activeNo),
        ]);

        if (isMounted) {
          if (!headerData) {
            setError(`Posted Transfer ${type} not found.`);
          } else {
            setHeader(headerData);
            setLines(linesData || []);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || `Failed to load posted transfer ${type}.`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [activeNo, type]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !header) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
        <p>{error || `Posted transfer ${type} not found`}</p>
      </div>
    );
  }

  const title = type === "shipment" ? "Posted Transfer Shipment" : "Posted Transfer Receipt";

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-6 p-4 pb-20">
        <div className="flex items-center justify-between border-b pb-2">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {type === "shipment" && (
            <div className="flex items-center gap-3">
              {/* E-Invoice Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2" disabled={!!actionLoading}>
                    {actionLoading?.startsWith("E-Invoice") ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    E-Invoice
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleAction("E-Invoice Generation", () => generateEInvoice("Transfer", header.No))}>
                    Generate E-invoice
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAction("E-Invoice Cancellation", () => cancelEInvoice("Transfer", header.No))}>
                    Cancel E-invoice
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* E-Way Bill Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2" disabled={!!actionLoading}>
                    {actionLoading?.startsWith("E-Way") ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    E-Way Bill
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleAction("E-Way Bill Generation", () => generateEWayBill("Transfer", header.No))}>
                    Generate E-way Bill
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAction("E-Way Bill Cancellation", () => cancelEWayBill("Transfer", header.No))}>
                    Cancel E-way Bill
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAction("Vehicle Update", () => {
                    if (!header.E_Way_Bill_No) {
                      throw new Error("E-Way Bill No. is missing on the document.");
                    }
                    return updateVehicle(header.No, header.E_Way_Bill_No);
                  })}>
                    Updated Vehicle
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAction("Transporter Update", () => {
                    if (!header.E_Way_Bill_No) {
                      throw new Error("E-Way Bill No. is missing on the document.");
                    }
                    return updateTransporter(header.No, header.E_Way_Bill_No);
                  })}>
                    Update Transporter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
            General Information
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4 lg:grid-cols-6">
            <SummaryField label={`${type === "shipment" ? "Shipment" : "Receipt"} No.`} value={header.No} />
            <SummaryField label="Posting Date" value={formatDate(header.Posting_Date)} />
            <SummaryField label="Transfer Order No." value={header.Transfer_Order_No} />
            <SummaryField label="External Doc No." value={header.External_Document_No} />
            <SummaryField label="LOB" value={header.Shortcut_Dimension_1_Code} />
            <SummaryField label="Branch" value={header.Shortcut_Dimension_2_Code} />
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
            Transfer Locations
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
            <SummaryField label="Transfer-from Code" value={header.Transfer_from_Code} />
            <SummaryField label="Transfer-from Name" value={header.Transfer_from_Name} />
            <SummaryField label="Transfer-to Code" value={header.Transfer_to_Code} />
            <SummaryField label="Transfer-to Name" value={header.Transfer_to_Name} />
            <SummaryField label="In-Transit Code" value={header.In_Transit_Code} />
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
            Transport & Logistics
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4 lg:grid-cols-5">
            <SummaryField label="Vehicle No." value={header.Vehicle_No} />
            <SummaryField label="LR/RR No." value={header.LR_RR_No} />
            <SummaryField label="LR/RR Date" value={formatDate(header.LR_RR_Date)} />
            <SummaryField label="Distance (Km)" value={header.Distance_Km} />
            <SummaryField label="Transporter Code" value={header.Transporter_Code} />
            <SummaryField label="Transporter Name" value={header.Transporter_Name} />
          </div>
        </div>

        <Separator />

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">
              Line Items
            </h2>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted bg-opacity-50">
                <tr className="whitespace-nowrap">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item No.</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Quantity</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Unit of Measure</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">GST Base Amt</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">GST %</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Total GST</th>
                  {type === "shipment" && (
                     <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-4 text-center text-muted-foreground">
                      No line items found.
                    </td>
                  </tr>
                ) : (
                  lines.map((line, index) => (
                    <tr
                      key={index}
                      className="border-t transition-colors hover:bg-muted/50 whitespace-nowrap"
                    >
                      <td className="px-4 py-3 font-medium">{line.Item_No || "-"}</td>
                      <td className="px-4 py-3">{line.Description || "-"}</td>
                      <td className="px-4 py-3 text-right font-medium">{line.Quantity?.toLocaleString() || 0}</td>
                      <td className="px-4 py-3">{line.Unit_of_Measure || "-"}</td>
                      <td className="px-4 py-3 text-right">{line.GSTBaseAmt?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}</td>
                      <td className="px-4 py-3 text-right">{line.GSTPer || 0}%</td>
                      <td className="px-4 py-3 text-right font-medium">{line.TotalGSTAMt?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}</td>
                      {type === "shipment" && (
                        <td className="px-4 py-3 text-right font-medium">{line.Amount != null ? line.Amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}</td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: any }) {
  if (value === undefined || value === null || value === "") {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">-</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{String(value)}</span>
    </div>
  );
}

function formatDate(dateStr?: string) {
  if (!dateStr || dateStr === "0001-01-01") return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString();
  } catch {
    return dateStr;
  }
}
