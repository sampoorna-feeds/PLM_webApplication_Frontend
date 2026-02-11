"use client";

import { useState } from "react";
import { Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { postProductionOrder } from "@/lib/api/services/production-orders.service";
import {
  ApiErrorDialog,
  extractApiError,
  type ApiErrorState,
} from "./api-error-dialog";

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface ProductionOrderPostConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prodOrderNo: string;
  onSuccess: () => void;
}

export function ProductionOrderPostConfirmationDialog({
  open,
  onOpenChange,
  prodOrderNo,
  onSuccess,
}: ProductionOrderPostConfirmationDialogProps) {
  const [postingDate, setPostingDate] = useState<string>(
    formatDate(new Date()),
  );
  const [isPosting, setIsPosting] = useState(false);
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);

  const handlePost = async () => {
    // Validate posting date
    if (!postingDate) {
      toast.error("Posting date is required");
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(postingDate)) {
      toast.error("Invalid date format. Use YYYY-MM-DD");
      return;
    }

    setIsPosting(true);
    try {
      await postProductionOrder(prodOrderNo, postingDate);
      toast.success("Production order posted successfully");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error posting production order:", error);
      const { message, code } = extractApiError(error);
      setApiError({ title: "Post Failed", message, code });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Confirm Post Production Order</DialogTitle>
            <DialogDescription>
              Enter the posting date for production order{" "}
              <span className="text-foreground font-medium">{prodOrderNo}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="postingDate">
                Posting Date <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="postingDate"
                  type="date"
                  value={postingDate}
                  onChange={(e) => setPostingDate(e.target.value)}
                  required
                  className="pr-10"
                />
                <Calendar className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
              </div>
              <p className="text-muted-foreground text-xs">
                Format: YYYY-MM-DD (e.g., {formatDate(new Date())})
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPosting}
            >
              Cancel
            </Button>
            <Button onClick={handlePost} disabled={isPosting}>
              {isPosting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post Journal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ApiErrorDialog error={apiError} onClose={() => setApiError(null)} />
    </>
  );
}
