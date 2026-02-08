"use client";

import { AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ApiErrorState {
  title: string;
  message: string;
  code?: string;
}

/**
 * Extract error details from any caught error.
 * Handles ApiError objects (thrown by apiRequest as plain objects),
 * Error instances, and unknown types.
 *
 * Also cleans up BC-specific noise like CorrelationId from the message.
 */
export function extractApiError(error: unknown): {
  message: string;
  code?: string;
} {
  let message = "An unknown error occurred";
  let code: string | undefined;

  // Handle ApiError objects (thrown by apiRequest as plain objects)
  if (error && typeof error === "object" && "message" in error) {
    const e = error as { message: string; code?: string };
    message = e.message;
    code = e.code;
  }
  // Handle Error instances
  else if (error instanceof Error) {
    message = error.message;
  }
  // Fallback
  else if (error) {
    message = String(error);
  }

  // Clean up BC CorrelationId noise from the message
  message = message.replace(/\s*CorrelationId:\s*[a-f0-9-]+\.?/gi, "").trim();

  return { message, code };
}

interface ApiErrorDialogProps {
  error: ApiErrorState | null;
  onClose: () => void;
}

export function ApiErrorDialog({ error, onClose }: ApiErrorDialogProps) {
  return (
    <AlertDialog open={!!error} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <div className="bg-destructive/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <AlertCircle className="text-destructive h-6 w-6" />
          </div>
          <AlertDialogTitle className="text-center">
            {error?.title || "Error"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-foreground text-center text-sm whitespace-pre-line">
            {error?.message || "An unexpected error occurred."}
          </AlertDialogDescription>
          {error?.code && (
            <p className="text-muted-foreground text-center text-xs">
              Code: {error.code}
            </p>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction onClick={onClose}>Close</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
