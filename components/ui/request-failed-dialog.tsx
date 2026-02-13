"use client";

/**
 * Request Failed Dialog
 * Common dialog for API/request failures with title "Request failed" and cleaned message.
 * Uses cleanApiErrorMessage to strip CorrelationId and similar noise.
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
import { cleanApiErrorMessage } from "@/lib/errors";

export interface RequestFailedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Raw message from API/error; will be cleaned (CorrelationId removed) for display */
  message?: string | null;
}

export function RequestFailedDialog({
  open,
  onOpenChange,
  message,
}: RequestFailedDialogProps) {
  const displayMessage = cleanApiErrorMessage(message) || "The request failed. Please try again.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="text-destructive h-5 w-5 shrink-0" />
            <DialogTitle className="text-destructive">Request failed</DialogTitle>
          </div>
          <DialogDescription asChild>
            <p className="text-foreground mt-2 whitespace-pre-wrap text-sm">
              {displayMessage}
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
