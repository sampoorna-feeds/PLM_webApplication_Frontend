"use client";

/**
 * Error Dialog Component
 * Displays detailed error messages from API/ERP failures
 */

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export interface ErrorDetail {
  entryId?: string;
  entryLabel?: string;
  message: string;
  code?: string;
  status?: number;
  details?: string;
}

export interface ErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message?: string;
  errors?: ErrorDetail[];
  type?: "submit" | "post" | "upload" | "general";
}

export function ErrorDialog({
  open,
  onOpenChange,
  title,
  message,
  errors = [],
  type = "general",
}: ErrorDialogProps) {
  const getDefaultTitle = () => {
    switch (type) {
      case "submit":
        return "Voucher Submission Failed";
      case "post":
        return "Post Vouchers Failed";
      case "upload":
        return "File Upload Failed";
      default:
        return "Error Occurred";
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case "submit":
        return "Some vouchers failed to submit. Please review the errors below:";
      case "post":
        return "Failed to post vouchers. Please review the errors below:";
      case "upload":
        return "Some files failed to upload. Please review the errors below:";
      default:
        return "An error occurred. Please review the details below:";
    }
  };

  const displayTitle = title || getDefaultTitle();
  const displayMessage = message || getDefaultMessage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="text-destructive h-5 w-5" />
            <DialogTitle className="text-destructive">
              {displayTitle}
            </DialogTitle>
          </div>
          <DialogDescription>{displayMessage}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {errors.length > 0 ? (
            <div className="space-y-3">
              {errors.map((error, index) => (
                <div
                  key={index}
                  className="border-destructive/20 bg-destructive/5 space-y-2 rounded-lg border p-4"
                >
                  {error.entryLabel && (
                    <div className="text-foreground text-sm font-semibold">
                      {error.entryLabel}
                    </div>
                  )}
                  <div className="text-foreground text-sm">{error.message}</div>
                  {(error.code || error.status) && (
                    <div className="text-muted-foreground flex gap-4 text-xs">
                      {error.code && <span>Code: {error.code}</span>}
                      {error.status && <span>Status: {error.status}</span>}
                    </div>
                  )}
                  {error.details && (
                    <details className="mt-2">
                      <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
                        View Details
                      </summary>
                      <pre className="bg-muted mt-2 overflow-x-auto rounded p-2 text-xs">
                        {error.details}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="border-destructive/20 bg-destructive/5 rounded-lg border p-4">
              <div className="text-foreground text-sm">
                {displayMessage || "An unexpected error occurred."}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
