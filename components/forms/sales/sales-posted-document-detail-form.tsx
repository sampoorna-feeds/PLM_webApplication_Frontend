"use client";

import { useEffect, useState } from "react";
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
} from "@/lib/api/services/sales-posted-invoices.service";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { SalesPostedDocumentType } from "./sales-posted-document-config";

type Header = PostedSalesShipment | PostedSalesInvoiceHeader;
type Line = PostedSalesShipmentLine | PostedSalesInvoiceLine;

interface Props {
  tabId: string;
  formData?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export function SalesPostedDocumentDetailForm({ context }: Props) {
  const { currentTab } = useFormStackContext();
  const ctx = context ?? currentTab?.context ?? {};
  const no = ctx.no as string | undefined;
  const documentType = ctx.documentType as SalesPostedDocumentType | undefined;

  const [header, setHeader] = useState<Header | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!no || !documentType) return;
    let mounted = true;

    const load = async () => {
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
        if (!mounted) return;
        if (!h) {
          setError("Document not found.");
        } else {
          setHeader(h);
          setLines(l);
        }
      } catch (err: unknown) {
        if (mounted)
          setError(
            err instanceof Error ? err.message : "Failed to load document.",
          );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [no, documentType]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
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

  const isShipment = documentType === "posted-shipment";
  const inv = header as PostedSalesInvoiceHeader;
  const shp = header as PostedSalesShipment;

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-6 p-4 pb-20">
        {/* General */}
        <div>
          <SectionTitle>General Information</SectionTitle>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
            <Field label={isShipment ? "Shipment No." : "Invoice No."} value={header.No} />
            <Field label="Posting Date" value={fmtDate(header.Posting_Date)} />
            <Field label="Document Date" value={fmtDate(header.Document_Date)} />
            {isShipment && (
              <Field label="Shipment Date" value={fmtDate(shp.Shipment_Date)} />
            )}
            {!isShipment && (
              <Field label="Order Date" value={fmtDate(inv.Order_Date)} />
            )}
            <Field label="Order No." value={header.Order_No} />
            <Field label="External Doc No." value={header.External_Document_No} />
            {!isShipment && (
              <Field label="Invoice Type" value={inv.Invoice_Type} />
            )}
            <Field label="Currency Code" value={header.Currency_Code} />
          </div>
        </div>

        {/* Customer */}
        <div>
          <SectionTitle>Customer</SectionTitle>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
            <Field label="Customer No." value={header.Sell_to_Customer_No} />
            <Field label="Customer Name" value={header.Sell_to_Customer_Name} />
            <Field label="Bill-to Customer No." value={header.Bill_to_Customer_No} />
            <Field label="Bill-to Name" value={header.Bill_to_Name} />
            <Field label="Ship-to Code" value={header.Ship_to_Code} />
            <Field label="Ship-to Name" value={header.Ship_to_Name} />
          </div>
        </div>

        {/* Transport */}
        <div>
          <SectionTitle>Transport & Logistics</SectionTitle>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
            <Field label="Transporter Code" value={header.Transporter_Code} />
            <Field label="Vehicle No." value={header.Vehicle_No} />
            <Field label="LR/RR No." value={header.LR_RR_No} />
            <Field label="LR/RR Date" value={fmtDate(header.LR_RR_Date)} />
          </div>
        </div>

        {/* Dimensions */}
        <div>
          <SectionTitle>Dimensions & Location</SectionTitle>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
            <Field label="Location" value={header.Location_Code} />
            <Field label="Salesperson" value={header.Salesperson_Code} />
            <Field label="LOB" value={header.Shortcut_Dimension_1_Code} />
            <Field label="Branch" value={header.Shortcut_Dimension_2_Code} />
          </div>
        </div>

        {!isShipment && (
          <>
            <div>
              <SectionTitle>Amounts</SectionTitle>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
                <Field label="Amount" value={fmtCurrency(inv.Amount)} />
                <Field label="Amount (incl. VAT)" value={fmtCurrency(inv.Amount_Including_VAT)} />
                <Field label="Remaining Amount" value={fmtCurrency(inv.Remaining_Amount)} />
                <Field label="Due Date" value={fmtDate(inv.Due_Date)} />
                <Field label="Closed" value={inv.Closed === true ? "Yes" : inv.Closed === false ? "No" : undefined} />
                <Field label="Cancelled" value={inv.Cancelled === true ? "Yes" : inv.Cancelled === false ? "No" : undefined} />
              </div>
            </div>
            <div>
              <SectionTitle>E-Invoice</SectionTitle>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
                <Field label="E-Invoice Status" value={inv.E_Invoice_Status} />
                <Field label="E-Invoice No." value={inv.E_Invoice_No} />
                <Field label="E-Way Bill No." value={inv.E_Way_Bill_No} />
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Lines */}
        <div>
          <h2 className="mb-4 text-base font-semibold uppercase tracking-wider text-muted-foreground">
            Line Items
          </h2>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr className="whitespace-nowrap border-b">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Line No.
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    No.
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                    UOM
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Unit Price
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Disc %
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Line Amount
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    GST Group
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    HSN/SAC
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="p-4 text-center text-muted-foreground"
                    >
                      No line items found.
                    </td>
                  </tr>
                ) : (
                  lines.map((line, idx) => (
                    <tr
                      key={idx}
                      className="border-t transition-colors hover:bg-muted/50 whitespace-nowrap"
                    >
                      <td className="px-4 py-2 text-muted-foreground">
                        {line.Line_No}
                      </td>
                      <td className="px-4 py-2">{line.Type || "-"}</td>
                      <td className="px-4 py-2 font-medium">{line.No || "-"}</td>
                      <td className="px-4 py-2">{line.Description || "-"}</td>
                      <td className="px-4 py-2 text-right">
                        {line.Quantity?.toLocaleString() ?? "-"}
                      </td>
                      <td className="px-4 py-2">
                        {line.Unit_of_Measure_Code || line.Unit_of_Measure || "-"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {line.Unit_Price != null
                          ? line.Unit_Price.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })
                          : "-"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {line.Line_Discount_Percent != null
                          ? `${line.Line_Discount_Percent}%`
                          : "-"}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {line.Line_Amount != null
                          ? line.Line_Amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })
                          : "-"}
                      </td>
                      <td className="px-4 py-2">{line.GST_Group_Code || "-"}</td>
                      <td className="px-4 py-2">{line.HSN_SAC_Code || "-"}</td>
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 border-b pb-1 text-base font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  const display =
    value === undefined || value === null || value === ""
      ? "-"
      : String(value);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{display}</span>
    </div>
  );
}

function fmtDate(d?: string) {
  if (!d || d === "0001-01-01") return "-";
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString();
  } catch {
    return d;
  }
}

function fmtCurrency(n?: number) {
  if (n == null) return "-";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2 });
}
