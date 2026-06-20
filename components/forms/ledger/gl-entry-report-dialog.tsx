"use client";

import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { DimensionSelect } from "@/components/forms/dimension-select";
import { AccountSelect } from "@/components/forms/account-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  generateDayBookReport, 
  type GLEntryFilters 
} from "@/lib/api/services/gl-entry.service";
import { downloadExcelFromBase64 } from "@/lib/file-utils";
import { viewPdfFromBase64 } from "@/lib/pdf-utils";
import { toast } from "sonner";
import { Loader2, FileText, Calendar, Building2, BookOpen, Download } from "lucide-react";

interface GLEntryReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: "CashBook" | "DayBook";
  onReportTypeChange: (type: "CashBook" | "DayBook") => void;
  filters: GLEntryFilters;
}

export function GLEntryReportDialog({
  open,
  onOpenChange,
  reportType,
  onReportTypeChange,
  filters,
}: GLEntryReportDialogProps) {
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [branch, setBranch] = useState<string>("");
  const [glAccount, setGlAccount] = useState<string>("");
  const [reportExt, setReportExt] = useState<"Excel" | "Pdf">("Excel");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync initial values from filters when the dialog opens
  useEffect(() => {
    if (open) {
      setFromDate(filters.fromDate || "");
      setToDate(filters.toDate || "");
      setGlAccount(filters.accountNo || "");
      setErrors({});
    }
  }, [open, filters]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fromDate) {
      newErrors.fromDate = "From date is required";
    }
    if (!toDate) {
      newErrors.toDate = "To date is required";
    }
    if (fromDate && toDate && fromDate > toDate) {
      newErrors.toDate = "To date must be after from date";
    }
    if (!branch) {
      newErrors.branch = "Branch is required";
    }
    if (reportType === "CashBook" && !glAccount) {
      newErrors.glAccount = "G/L Account is required for Cash Book";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerate = async () => {
    if (!validate()) {
      toast.error("Please correct the validation errors.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        reportN: reportType,
        fromDate,
        toDate,
        branch,
        reportExt,
        ...(glAccount ? { gLAccount: glAccount } : {}),
      };

      const base64Data = await generateDayBookReport(payload);

      if (!base64Data) {
        throw new Error("No data returned from report service.");
      }

      const formattedReportName = reportType === "CashBook" ? "Cash_Book" : "Day_Book";
      const accountSuffix = glAccount ? `_${glAccount}` : "";
      const fileName = `${formattedReportName}_${branch}${accountSuffix}_${fromDate}_to_${toDate}`;

      if (reportExt === "Excel") {
        downloadExcelFromBase64(base64Data, fileName);
      } else {
        viewPdfFromBase64(base64Data, fileName);
      }

      toast.success(`${reportType === "CashBook" ? "Cash Book" : "Day Book"} report generated successfully.`);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Report generation error:", error);
      toast.error(error?.message || "Failed to generate report. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-xl border shadow-2xl bg-background">
        
        {/* Visual Top Bar / Header Accent */}
        <div className="h-1.5 bg-gradient-to-r from-primary/80 via-primary to-primary/60 w-full" />
        
        <div className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Generate Ledger Report
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select your options below to export the Day Book or Cash Book report.
            </DialogDescription>
          </DialogHeader>

          {/* Form Fields */}
          <div className="space-y-4">
            
            {/* Report Type Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Report Type
              </Label>
              <Select 
                value={reportType} 
                onValueChange={(val) => {
                  onReportTypeChange(val as "CashBook" | "DayBook");
                  // Clear errors when toggling report types
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.glAccount;
                    return next;
                  });
                }}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Select Report Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DayBook">Day Book Report</SelectItem>
                  <SelectItem value="CashBook">Cash Book Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Picker */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="report-from-date" className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  From Date <span className="text-destructive">*</span>
                </Label>
                <DateInput 
                  id="report-from-date" 
                  value={fromDate} 
                  onChange={(val) => {
                    setFromDate(val);
                    setErrors((prev) => ({ ...prev, fromDate: "" }));
                  }}
                  className={errors.fromDate ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.fromDate && (
                  <span className="text-[10px] text-destructive font-medium block">
                    {errors.fromDate}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="report-to-date" className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  To Date <span className="text-destructive">*</span>
                </Label>
                <DateInput 
                  id="report-to-date" 
                  value={toDate} 
                  onChange={(val) => {
                    setToDate(val);
                    setErrors((prev) => ({ ...prev, toDate: "" }));
                  }}
                  className={errors.toDate ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.toDate && (
                  <span className="text-[10px] text-destructive font-medium block">
                    {errors.toDate}
                  </span>
                )}
              </div>
            </div>

            {/* Branch Code */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                Branch Code <span className="text-destructive">*</span>
              </Label>
              <DimensionSelect
                dimensionType="BRANCH"
                value={branch}
                onChange={(val) => {
                  setBranch(val);
                  setErrors((prev) => ({ ...prev, branch: "" }));
                }}
                placeholder="Search branch code..."
                className={errors.branch ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.branch && (
                <span className="text-[10px] text-destructive font-medium block">
                  {errors.branch}
                </span>
              )}
            </div>

            {/* G/L Account Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" />
                G/L Account {reportType === "CashBook" ? <span className="text-destructive">*</span> : <span className="text-muted-foreground font-normal">(Optional)</span>}
              </Label>
              <AccountSelect
                accountType="G/L Account"
                value={glAccount}
                onChange={(val) => {
                  setGlAccount(val);
                  setErrors((prev) => ({ ...prev, glAccount: "" }));
                }}
                placeholder="Search G/L account..."
                className={errors.glAccount ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.glAccount && (
                <span className="text-[10px] text-destructive font-medium block">
                  {errors.glAccount}
                </span>
              )}
            </div>

            {/* Export Format Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Export Format
              </Label>
              <Select 
                value={reportExt} 
                onValueChange={(val: "Excel" | "Pdf") => setReportExt(val)}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Excel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excel">Excel Spreadsheet (.xlsx)</SelectItem>
                  <SelectItem value="Pdf">PDF Document (.pdf)</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>

          <DialogFooter className="pt-2 border-t flex items-center justify-between gap-3 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="h-9 px-4 text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={isLoading}
              className="h-9 px-4 text-xs font-medium gap-1.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Generate Report
                </>
              )}
            </Button>
          </DialogFooter>
        </div>

      </DialogContent>
    </Dialog>
  );
}
