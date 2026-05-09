"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

export interface ErrorDetail {
  field?: string;
  message: string;
  code?: string;
  status?: number;
  details?: string;
  entryId?: string;
  entryLabel?: string;
}

export interface ErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message?: string;
  errors?: ErrorDetail[];
  type?: string;
  onClose?: () => void;
}

export function ErrorDialog({
  open,
  onOpenChange,
  title = "Error",
  message = "An unexpected error occurred.",
  errors = [],
  type,
  onClose,
}: ErrorDialogProps) {
  const handleClose = () => {
    onOpenChange(false);
    if (onClose) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="pointer-events-none flex flex-col items-center justify-center border-none bg-transparent p-0 shadow-none sm:max-w-[500px]">
        <div className="bg-background/95 animate-in zoom-in-95 pointer-events-auto flex w-full flex-col items-center space-y-8 rounded-[2.5rem] border border-red-500/20 p-12 text-center shadow-[0_0_50px_-12px_rgba(239,68,68,0.3)] backdrop-blur-md duration-300">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-red-500/20 blur-3xl" />
            <div className="relative rounded-full border border-red-500/20 bg-red-500/10 p-6">
              <AlertTriangle className="h-16 w-16 stroke-[1.5px] text-red-500" />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-foreground from-foreground to-foreground/70 bg-linear-to-br bg-clip-text text-4xl font-black tracking-tight">
              {title}
            </h2>
            <p className="text-muted-foreground mx-auto max-w-[320px] text-lg leading-relaxed font-medium">
              {message}
            </p>
            {errors.length > 0 && (
              <div className="mt-4 max-h-[150px] w-full overflow-y-auto rounded-xl bg-red-500/5 p-4 text-left">
                <ul className="space-y-2">
                  {errors.map((err, i) => (
                    <li key={i} className="text-red-400 text-sm">
                      {err.field ? <span className="font-bold">{err.field}: </span> : null}
                      {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Button
            onClick={handleClose}
            className="h-14 w-full rounded-2xl bg-red-600 text-lg font-bold text-white shadow-lg shadow-red-900/20 transition-all hover:bg-red-700 hover:shadow-red-900/30 active:scale-95"
          >
            Understood
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
