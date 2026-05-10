import React from "react";
import { ErrorDialog } from "@/components/ui/error-dialog";
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
  const displayMessage =
    cleanApiErrorMessage(message) || "The request failed. Please try again.";

  return (
    <ErrorDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Request failed"
      message={displayMessage}
    />
  );
}
