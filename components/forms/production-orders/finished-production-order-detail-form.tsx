/**
 * Finished Production Order Detail Form
 * Read-only view of a finished production order with all fields.
 * Opened via FormStack when clicking a row in the Finished tab.
 */

"use client";

import React, { useState, useEffect } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import {
  getFinishedProductionOrderByNo,
  getFinishedProductionOrderLines,
  type ProductionOrder,
  type ProductionOrderLine,
} from "@/lib/api/services/production-orders.service";
import { ProductionOrderQRDialog } from "./production-order-qr-dialog";
import { ProductionOrderWorkOrderDialog } from "./production-order-work-order-dialog";
import { ProductionOrderLinesTable } from "./production-order-lines-table";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/date";

interface FinishedProductionOrderDetailFormProps {
  tabId: string;
  formData?: Record<string, unknown>;
  context?: Record<string, unknown>;
}


function formatValue(val: unknown): string {
  if (val === null || val === undefined || val === "") return "-";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "number") return val.toLocaleString();
  return String(val);
}

/** Human-readable labels for ProductionOrder fields */
const FIELD_LABELS: Record<string, string> = {
  No: "Order No",
  Status: "Status",
  Description: "Description",
  Description_2: "Description 2",
  Source_Type: "Source Type",
  Source_No: "Source No",
  Search_Description: "Search Description",
  Supervisor_Name: "Supervisor Name",
  Quantity: "Quantity",
  Due_Date: "Due Date",
  Blocked: "Blocked",
  Location_Code: "Location Code",
  Hatching_Date: "Hatching Date",
  Breed_Code: "Breed Code",
  Hatchery_Entry: "Hatchery Entry",
  Hatchery_Name: "Hatchery Name",
  Hatchery_No: "Hatchery No",
  Flock_No_Breeder: "Flock No (Breeder)",
  Laying_EGG_Week: "Laying Egg Week",
  STD_Percent: "STD Percent",
  Opening_Female_Bird: "Opening Female Bird",
  DOC_Placing_Date: "DOC Placing Date",
  Flock_Value: "Flock Value",
  Prod_Bom_No: "Prod BOM No",
  BOM_Version_No: "BOM Version No",
  Batch_Size: "Batch Size",
  Variant_Code: "Variant Code",
  SFPL_User_ID: "Assigned User ID",
  Last_Date_Modified: "Last Date Modified",
  Starting_Time: "Starting Time",
  Starting_Date: "Starting Date",
  Ending_Time: "Ending Time",
  Ending_Date: "Ending Date",
  Starting_Date_Time: "Starting Date/Time",
  Ending_Date_Time: "Ending Date/Time",
  Inventory_Posting_Group: "Inventory Posting Group",
  Gen_Prod_Posting_Group: "Gen. Prod. Posting Group",
  Gen_Bus_Posting_Group: "Gen. Bus. Posting Group",
  Shortcut_Dimension_1_Code: "LOB",
  Shortcut_Dimension_2_Code: "Branch",
  Shortcut_Dimension_3_Code: "Location (Dim)",
  Bin_Code: "Bin Code",
  Routing_No: "Routing No",
  Finished_Date: "Finished Date",
};

/** Field grouping for display */
const FIELD_GROUPS: { title: string; fields: string[] }[] = [
  {
    title: "General",
    fields: [
      "No",
      "Status",
      "Description",
      "Description_2",
      "Search_Description",
      "Supervisor_Name",
      "SFPL_User_ID",
    ],
  },
  {
    title: "Source & Production",
    fields: [
      "Source_Type",
      "Source_No",
      "Quantity",
      "Prod_Bom_No",
      "BOM_Version_No",
      "Batch_Size",
      "Variant_Code",
      "Routing_No",
    ],
  },
  {
    title: "Dates",
    fields: [
      "Due_Date",
      "Starting_Date",
      "Starting_Time",
      "Starting_Date_Time",
      "Ending_Date",
      "Ending_Time",
      "Ending_Date_Time",
      "Finished_Date",
      "Last_Date_Modified",
    ],
  },
  {
    title: "Dimensions & Location",
    fields: [
      "Location_Code",
      "Shortcut_Dimension_1_Code",
      "Shortcut_Dimension_2_Code",
      "Shortcut_Dimension_3_Code",
      "Bin_Code",
    ],
  },
  {
    title: "Posting Groups",
    fields: [
      "Inventory_Posting_Group",
      "Gen_Prod_Posting_Group",
      "Gen_Bus_Posting_Group",
    ],
  },
  {
    title: "Hatchery",
    fields: [
      "Hatchery_Entry",
      "Hatchery_Name",
      "Hatchery_No",
      "Hatching_Date",
      "Breed_Code",
      "Flock_No_Breeder",
      "Laying_EGG_Week",
      "STD_Percent",
      "Opening_Female_Bird",
      "DOC_Placing_Date",
      "Flock_Value",
    ],
  },
  {
    title: "Other",
    fields: ["Blocked"],
  },
];

/** Keys to skip (internal OData fields) */
const SKIP_KEYS = new Set([
  "@odata.etag",
  "@odata.context",
  "Batch_Barcode@odata.mediaEditLink",
  "Batch_Barcode@odata.mediaReadLink",
]);

/** Date-type fields */
const DATE_FIELDS = new Set([
  "Due_Date",
  "Hatching_Date",
  "DOC_Placing_Date",
  "Last_Date_Modified",
  "Starting_Date",
  "Ending_Date",
  "Finished_Date",
]);

export function FinishedProductionOrderDetailForm({
  tabId,
  context,
}: FinishedProductionOrderDetailFormProps) {
  const { updateTab } = useFormStack(tabId);
  const orderNo = context?.orderNo as string | undefined;

  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [orderLines, setOrderLines] = useState<ProductionOrderLine[]>([]);
  const [isLoadingLines, setIsLoadingLines] = useState(false);
  const [isRefreshingLines, setIsRefreshingLines] = useState(false);

  // Load order data on mount / when orderNo changes
  useEffect(() => {
    if (!orderNo) {
      setError("No order number provided");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getFinishedProductionOrderByNo(orderNo)
      .then((data) => {
        if (!cancelled) {
          setOrder(data);
          updateTab({ isSaved: true });
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err?.message || "Failed to load order");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNo]);

  // Load order lines on mount
  useEffect(() => {
    if (!orderNo) return;

    let cancelled = false;
    setIsLoadingLines(true);

    getFinishedProductionOrderLines(orderNo)
      .then((lines) => {
        if (!cancelled) setOrderLines(lines);
      })
      .catch(() => {
        if (!cancelled) setOrderLines([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingLines(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderNo]);

  const handleRefreshLines = async () => {
    if (!orderNo) return;
    setIsRefreshingLines(true);
    try {
      const lines = await getFinishedProductionOrderLines(orderNo);
      setOrderLines(lines);
    } catch {
      // silent
    } finally {
      setIsRefreshingLines(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="text-muted-foreground h-10 w-10 animate-spin" />
        <p className="text-muted-foreground mt-2 text-sm">
          Loading finished order...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-destructive text-sm">{error || "Order not found"}</p>
      </div>
    );
  }

  const orderRecord = order as unknown as Record<string, unknown>;

  // Collect any extra fields not covered by FIELD_GROUPS
  const coveredFields = new Set(FIELD_GROUPS.flatMap((g) => g.fields));
  const extraFields = Object.keys(orderRecord).filter(
    (key) =>
      !coveredFields.has(key) &&
      !SKIP_KEYS.has(key) &&
      orderRecord[key] !== null &&
      orderRecord[key] !== undefined &&
      orderRecord[key] !== "",
  );

  return (
    <div className="flex flex-col gap-6 px-6 py-4">
      {/* Header row: Read-only badge + QR Code button */}
      <div className="flex items-center justify-between gap-2">
        <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium">
          Read Only
        </span>
        <div className="flex items-center gap-2">
          {orderNo && <ProductionOrderQRDialog prodOrderNo={orderNo} />}
          {orderNo && <ProductionOrderWorkOrderDialog prodOrderNo={orderNo} />}
        </div>
      </div>

      {/* Field groups */}
      {FIELD_GROUPS.map((group) => {
        // Only show group if at least one field has a non-empty value
        const fieldsWithValues = group.fields.filter((field) => {
          const val = orderRecord[field];
          return (
            val !== null &&
            val !== undefined &&
            val !== "" &&
            val !== "0001-01-01"
          );
        });
        if (fieldsWithValues.length === 0) return null;

        return (
          <div key={group.title} className="bg-muted/30 rounded-lg p-4">
            <div className="mb-3 text-sm font-semibold">{group.title}</div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {fieldsWithValues.map((field) => {
                const rawVal = orderRecord[field];
                const displayVal = DATE_FIELDS.has(field)
                  ? formatDate(rawVal as string)
                  : formatValue(rawVal);
                return (
                  <div key={field}>
                    <span className="text-muted-foreground block text-xs">
                      {FIELD_LABELS[field] || field.replace(/_/g, " ")}
                    </span>
                    <span className="font-medium break-words">
                      {displayVal}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Extra fields not in predefined groups */}
      {extraFields.length > 0 && (
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="mb-3 text-sm font-semibold">Additional Fields</div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {extraFields.map((field) => {
              const rawVal = orderRecord[field];
              const displayVal = DATE_FIELDS.has(field)
                ? formatDate(rawVal as string)
                : formatValue(rawVal);
              return (
                <div key={field}>
                  <span className="text-muted-foreground block text-xs">
                    {FIELD_LABELS[field] || field.replace(/_/g, " ")}
                  </span>
                  <span className="font-medium break-words">{displayVal}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Finished Production Order Lines */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-muted-foreground text-sm font-medium">
            Finished Production Order Lines
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshLines}
            disabled={isRefreshingLines || isLoadingLines}
            title="Refresh order lines"
          >
            {isRefreshingLines ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <ProductionOrderLinesTable
          lines={orderLines}
          isLoading={isLoadingLines}
        />
      </div>
    </div>
  );
}
