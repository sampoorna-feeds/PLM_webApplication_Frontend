"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";

export interface SuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message?: string;
  onClose?: () => void;
}

export function SuccessDialog({
  open,
  onOpenChange,
  title = "Success!",
  message = "Operation completed successfully.",
  onClose,
}: SuccessDialogProps) {
  const handleClose = () => {
    onOpenChange(false);
    if (onClose) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="pointer-events-none flex flex-col items-center justify-center border-none bg-transparent p-0 shadow-none sm:max-w-[500px]">
        <div className="bg-background/95 animate-in zoom-in-95 pointer-events-auto flex w-full flex-col items-center space-y-8 rounded-[2.5rem] border border-green-500/20 p-12 text-center shadow-[0_0_50px_-12px_rgba(34,197,94,0.3)] backdrop-blur-md duration-300">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-green-500/20 blur-3xl" />
            <div className="relative rounded-full border border-green-500/20 bg-green-500/10 p-6">
              <CheckCircle2 className="h-16 w-16 stroke-[1.5px] text-green-500" />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-foreground from-foreground to-foreground/70 bg-linear-to-br bg-clip-text text-4xl font-black tracking-tight">
              {title}
            </h2>
            <p className="text-muted-foreground mx-auto max-w-[320px] text-lg leading-relaxed font-medium">
              {message}
            </p>
          </div>

          <Button
            onClick={handleClose}
            className="h-14 w-full rounded-2xl bg-green-600 text-lg font-bold text-white shadow-lg shadow-green-900/20 transition-all hover:bg-green-700 hover:shadow-green-900/30 active:scale-95"
          >
            Great!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
