"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import {
  getPostedShipmentByNo,
  getPostedShipmentLines,
  type PostedSalesShipment,
  type PostedSalesShipmentLine,
} from "@/lib/api/services/sales-posted-shipments.service";
import {
  getPostedInvoiceByNo,
  getPostedInvoiceLines,
  type PostedSalesInvoiceHeader,
  type PostedSalesInvoiceLine,
  generateEInvoice,
  cancelEInvoice,
  generateEWayBill,
  cancelEWayBill,
  updateVehicle,
  updateTransporter,
} from "@/lib/api/services/sales-posted-invoices.service";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { SalesPostedDocumentType } from "./sales-posted-document-config";
import { RequestFailedDialog } from "@/components/ui/request-failed-dialog";
import { getErrorMessage } from "@/lib/errors";

type Header = PostedSalesShipment | PostedSalesInvoiceHeader;
type Line = PostedSalesShipmentLine | PostedSalesInvoiceLine;

interface Props {
  tabId: string;
  formData?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

// ── Action Dialog Types ──────────────────────────────────────────────────────

type EInvoiceAction = "generate" | "cancel";
type EWayBillAction = "generate" | "cancel" | "updateVehicle" | "updateTransporter";

interface ActionDialogState {
  open: boolean;
  type: "einvoice" | "ewaybill" | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d || d === "0001-01-01") return "";
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString();
  } catch {
    return d;
  }
}

function fmtCurrency(n?: number) {
  if (n == null) return "";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

function fmtBool(v?: boolean) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "";
}

const fieldClass = "min-w-0 space-y-1.5";
const labelClass = "text-muted-foreground block text-xs font-medium";

function ViewField({ label, value }: { label: string; value?: string | number | boolean | null }) {
  const display =
    value === undefined || value === null || value === ""
      ? ""
      : typeof value === "boolean"
        ? fmtBool(value)
        : String(value);
  return (
    <div className={fieldClass}>
      <label className={labelClass}>{label}</label>
      <Input value={display} readOnly disabled className="bg-muted h-8 text-sm" />
    </div>
  );
}

// ── E-Invoice Dialog ──────────────────────────────────────────────────────────

function EInvoiceDialog({
  open,
  docno,
  onClose,
  onRefresh,
}: {
  open: boolean;
  docno: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState<EInvoiceAction | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAction = async (action: EInvoiceAction) => {
    setLoading(action);
    try {
      if (action === "generate") {
        await generateEInvoice(docno);
        toast.success("E-Invoice generated successfully.");
      } else {
        await cancelEInvoice(docno);
        toast.success("E-Invoice cancelled successfully.");
      }
      onClose();
      onRefresh();
    } catch (err) {
      setErrorMsg(getErrorMessage(err, `Failed to ${action === "generate" ? "generate" : "cancel"} E-Invoice.`));
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <RequestFailedDialog
        open={!!errorMsg}
        message={errorMsg}
        onOpenChange={(o) => !o && setErrorMsg(null)}
      />
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>E-Invoice Actions</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleAction("generate")}
              disabled={loading !== null}
            >
              {loading === "generate" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate E-Invoice
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleAction("cancel")}
              disabled={loading !== null}
            >
              {loading === "cancel" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel E-Invoice
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={loading !== null}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── E-Way Bill Dialog ─────────────────────────────────────────────────────────

function EWayBillDialog({
  open,
  docno,
  ewaybillno,
  onClose,
  onRefresh,
}: {
  open: boolean;
  docno: string;
  ewaybillno?: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState<EWayBillAction | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAction = async (action: EWayBillAction) => {
    setLoading(action);
    try {
      const billNo = ewaybillno || "";
      if (action === "generate") {
        await generateEWayBill(docno);
        toast.success("E-Way Bill generated successfully.");
      } else if (action === "cancel") {
        await cancelEWayBill(docno);
        toast.success("E-Way Bill cancelled successfully.");
      } else if (action === "updateVehicle") {
        await updateVehicle(docno, billNo);
        toast.success("Vehicle updated successfully.");
      } else if (action === "updateTransporter") {
        await updateTransporter(docno, billNo);
        toast.success("Transporter updated successfully.");
      }
      onClose();
      onRefresh();
    } catch (err) {
      setErrorMsg(getErrorMessage(err, "Action failed. Please try again."));
    } finally {
      setLoading(null);
    }
  };

  const hasBillNo = !!ewaybillno;

  return (
    <>
      <RequestFailedDialog
        open={!!errorMsg}
        message={errorMsg}
        onOpenChange={(o) => !o && setErrorMsg(null)}
      />
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>E-Way Bill Actions</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleAction("generate")}
              disabled={loading !== null}
            >
              {loading === "generate" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate E-Way Bill
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleAction("cancel")}
              disabled={loading !== null}
            >
              {loading === "cancel" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel E-Way Bill
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleAction("updateVehicle")}
              disabled={loading !== null || !hasBillNo}
              title={!hasBillNo ? "E-Way Bill No. required" : undefined}
            >
              {loading === "updateVehicle" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Vehicle
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleAction("updateTransporter")}
              disabled={loading !== null || !hasBillNo}
              title={!hasBillNo ? "E-Way Bill No. required" : undefined}
            >
              {loading === "updateTransporter" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Transporter
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={loading !== null}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Lines Table ───────────────────────────────────────────────────────────────

function PostedLinesTable({
  lines,
  isInvoice,
}: {
  lines: Line[];
  isInvoice: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted whitespace-nowrap">
            <TableHead className="text-xs font-bold uppercase">Line No.</TableHead>
            <TableHead className="text-xs font-bold uppercase">Type</TableHead>
            <TableHead className="text-xs font-bold uppercase">No.</TableHead>
            <TableHead className="text-xs font-bold uppercase">Description</TableHead>
            <TableHead className="text-right text-xs font-bold uppercase">Qty</TableHead>
            <TableHead className="text-xs font-bold uppercase">UOM</TableHead>
            {isInvoice && (
              <>
                <TableHead className="text-right text-xs font-bold uppercase">Unit Price</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase">Disc %</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase">Line Amount</TableHead>
              </>
            )}
            <TableHead className="text-xs font-bold uppercase">GST Group</TableHead>
            <TableHead className="text-xs font-bold uppercase">HSN/SAC</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isInvoice ? 11 : 8} className="h-20 text-center text-muted-foreground">
                No line items found.
              </TableCell>
            </TableRow>
          ) : (
            lines.map((line, idx) => {
              const l = line as Record<string, unknown>;
              return (
                <TableRow key={idx} className="whitespace-nowrap text-xs hover:bg-muted/50">
                  <TableCell className="text-muted-foreground">{String(l.Line_No ?? "-")}</TableCell>
                  <TableCell>{String(l.Type || "-")}</TableCell>
                  <TableCell className="font-medium">{String(l.No || "-")}</TableCell>
                  <TableCell>{String(l.Description || "-")}</TableCell>
                  <TableCell className="text-right">
                    {l.Quantity != null ? Number(l.Quantity).toLocaleString() : "-"}
                  </TableCell>
                  <TableCell>{String(l.Unit_of_Measure_Code || l.Unit_of_Measure || "-")}</TableCell>
                  {isInvoice && (
                    <>
                      <TableCell className="text-right">
                        {l.Unit_Price != null
                          ? Number(l.Unit_Price).toLocaleString("en-IN", { minimumFractionDigits: 2 })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {l.Line_Discount_Percent != null ? `${l.Line_Discount_Percent}%` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {l.Line_Amount != null
                          ? Number(l.Line_Amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })
                          : "-"}
                      </TableCell>
                    </>
                  )}
                  <TableCell>{String(l.GST_Group_Code || "-")}</TableCell>
                  <TableCell>{String(l.HSN_SAC_Code || "-")}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Main Form ─────────────────────────────────────────────────────────────────

export function SalesPostedDocumentDetailForm({ context }: Props) {
  const { currentTab } = useFormStackContext();
  const ctx = context ?? currentTab?.context ?? {};
  const no = ctx.no as string | undefined;
  const documentType = ctx.documentType as SalesPostedDocumentType | undefined;

  const [header, setHeader] = useState<Header | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionDialog, setActionDialog] = useState<ActionDialogState>({ open: false, type: null });

  const isInvoice = documentType === "posted-invoice";

  const loadData = useCallback(async () => {
    if (!no || !documentType) return;
    setLoading(true);
    setError(null);
    try {
      const [h, l] = await Promise.all([
        documentType === "posted-shipment"
          ? getPostedShipmentByNo(no)
          : getPostedInvoiceByNo(no),
        documentType === "posted-shipment"
          ? getPostedShipmentLines(no)
          : getPostedInvoiceLines(no),
      ]);
      if (!h) {
        setError("Document not found.");
      } else {
        setHeader(h);
        setLines(l);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load document.");
    } finally {
      setLoading(false);
    }
  }, [no, documentType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshHeader = useCallback(async () => {
    if (!no || !isInvoice) return;
    try {
      const h = await getPostedInvoiceByNo(no);
      if (h) setHeader(h);
    } catch {
      // ignore
    }
  }, [no, isInvoice]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3 px-6 py-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (error || !header) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
        <p>{error ?? "Document not found."}</p>
      </div>
    );
  }

  const inv = header as PostedSalesInvoiceHeader;
  const shp = header as PostedSalesShipment;

  return (
    <>
      {/* E-Invoice Dialog */}
      {isInvoice && (
        <EInvoiceDialog
          open={actionDialog.open && actionDialog.type === "einvoice"}
          docno={no!}
          onClose={() => setActionDialog({ open: false, type: null })}
          onRefresh={refreshHeader}
        />
      )}

      {/* E-Way Bill Dialog */}
      {isInvoice && (
        <EWayBillDialog
          open={actionDialog.open && actionDialog.type === "ewaybill"}
          docno={no!}
          ewaybillno={inv.E_Way_Bill_No}
          onClose={() => setActionDialog({ open: false, type: null })}
          onRefresh={refreshHeader}
        />
      )}

      <div className="flex h-full flex-col">
        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
          <span className="text-muted-foreground mr-auto text-[10px] font-bold tracking-wider uppercase">
            {isInvoice ? "Posted Invoice" : "Posted Shipment"}
          </span>
          {isInvoice && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setActionDialog({ open: true, type: "ewaybill" })}
              >
                E-Way Bill
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setActionDialog({ open: true, type: "einvoice" })}
              >
                E-Invoice
              </Button>
            </>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-6 px-6 py-4">
            <Accordion
              type="multiple"
              defaultValue={["general", "customer", "transport", "dimensions", "amounts", "einvoice"]}
              className="space-y-0"
            >
              {/* General */}
              <AccordionItem value="general" className="border-none">
                <AccordionTrigger className="py-0 hover:no-underline [&>svg]:size-4">
                  <h3 className="px-2 py-1 text-left text-xs font-bold tracking-wider uppercase">
                    General
                  </h3>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <Separator className="mb-3" />
                  <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                      <ViewField
                        label={isInvoice ? "Invoice No." : "Shipment No."}
                        value={header.No}
                      />
                      <ViewField label="Posting Date" value={fmtDate(header.Posting_Date)} />
                      <ViewField label="Document Date" value={fmtDate(header.Document_Date)} />
                      {isInvoice ? (
                        <ViewField label="Order Date" value={fmtDate(inv.Order_Date)} />
                      ) : (
                        <ViewField label="Shipment Date" value={fmtDate(shp.Shipment_Date)} />
                      )}
                      <ViewField label="Order No." value={header.Order_No} />
                      <ViewField label="External Doc No." value={header.External_Document_No} />
                      {isInvoice && <ViewField label="Invoice Type" value={inv.Invoice_Type} />}
                      <ViewField label="Currency Code" value={header.Currency_Code} />
                    </div>
                </AccordionContent>
              </AccordionItem>

              <Separator />

              {/* Customer */}
              <AccordionItem value="customer" className="border-none">
                <AccordionTrigger className="py-0 hover:no-underline [&>svg]:size-4">
                  <h3 className="px-2 py-1 text-left text-xs font-bold tracking-wider uppercase">
                    Customer
                  </h3>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <Separator className="mb-3" />
                  <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                      <ViewField label="Customer No." value={header.Sell_to_Customer_No} />
                      <ViewField label="Customer Name" value={header.Sell_to_Customer_Name} />
                      <ViewField label="Bill-to Customer No." value={header.Bill_to_Customer_No} />
                      <ViewField label="Bill-to Name" value={header.Bill_to_Name} />
                      <ViewField label="Ship-to Code" value={header.Ship_to_Code} />
                      <ViewField label="Ship-to Name" value={header.Ship_to_Name} />
                    </div>
                </AccordionContent>
              </AccordionItem>

              <Separator />

              {/* Transport */}
              <AccordionItem value="transport" className="border-none">
                <AccordionTrigger className="py-0 hover:no-underline [&>svg]:size-4">
                  <h3 className="px-2 py-1 text-left text-xs font-bold tracking-wider uppercase">
                    Transport & Logistics
                  </h3>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <Separator className="mb-3" />
                  <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                      <ViewField label="Transporter Code" value={header.Transporter_Code} />
                      <ViewField label="Vehicle No." value={header.Vehicle_No} />
                      <ViewField label="LR/RR No." value={header.LR_RR_No} />
                      <ViewField label="LR/RR Date" value={fmtDate(header.LR_RR_Date)} />
                    </div>
                </AccordionContent>
              </AccordionItem>

              <Separator />

              {/* Dimensions */}
              <AccordionItem value="dimensions" className="border-none">
                <AccordionTrigger className="py-0 hover:no-underline [&>svg]:size-4">
                  <h3 className="px-2 py-1 text-left text-xs font-bold tracking-wider uppercase">
                    Dimensions & Location
                  </h3>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <Separator className="mb-3" />
                  <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                      <ViewField label="Location" value={header.Location_Code} />
                      <ViewField label="Salesperson" value={header.Salesperson_Code} />
                      <ViewField label="LOB" value={header.Shortcut_Dimension_1_Code} />
                      <ViewField label="Branch" value={header.Shortcut_Dimension_2_Code} />
                    </div>
                </AccordionContent>
              </AccordionItem>

              {/* Amounts — invoice only */}
              {isInvoice && <Separator />}
              {isInvoice && (
                <AccordionItem value="amounts" className="border-none">
                  <AccordionTrigger className="py-0 hover:no-underline [&>svg]:size-4">
                    <h3 className="px-2 py-1 text-left text-xs font-bold tracking-wider uppercase">
                      Amounts
                    </h3>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <Separator className="mb-3" />
                    <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                      <ViewField label="Amount" value={fmtCurrency(inv.Amount)} />
                      <ViewField label="Amount (incl. VAT)" value={fmtCurrency(inv.Amount_Including_VAT)} />
                      <ViewField label="Remaining Amount" value={fmtCurrency(inv.Remaining_Amount)} />
                      <ViewField label="Due Date" value={fmtDate(inv.Due_Date)} />
                      <ViewField label="Closed" value={fmtBool(inv.Closed)} />
                      <ViewField label="Cancelled" value={fmtBool(inv.Cancelled)} />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* E-Invoice — invoice only */}
              {isInvoice && <Separator />}
              {isInvoice && (
                <AccordionItem value="einvoice" className="border-none">
                  <AccordionTrigger className="py-0 hover:no-underline [&>svg]:size-4">
                    <h3 className="px-2 py-1 text-left text-xs font-bold tracking-wider uppercase">
                      E-Invoice & E-Way Bill
                    </h3>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <Separator className="mb-3" />
                    <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                      <ViewField label="E-Invoice Status" value={inv.E_Invoice_Status} />
                      <ViewField label="E-Invoice No." value={inv.E_Invoice_No} />
                      <ViewField label="E-Way Bill No." value={inv.E_Way_Bill_No} />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>

            {/* Lines */}
            <section className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <h3 className="text-foreground text-[10px] font-bold tracking-wider uppercase">
                  Line Items
                </h3>
                <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono text-[10px]">
                  {header.No}
                </span>
              </div>
              <PostedLinesTable lines={lines} isInvoice={isInvoice} />
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
