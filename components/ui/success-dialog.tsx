"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <DialogContent className="sm:max-w-[500px] border-none bg-transparent shadow-none p-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="bg-background/95 backdrop-blur-md border border-green-500/20 shadow-[0_0_50px_-12px_rgba(34,197,94,0.3)] p-12 rounded-[2.5rem] flex flex-col items-center text-center space-y-8 animate-in zoom-in-95 duration-300 pointer-events-auto w-full">
          <div className="relative">
            <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full animate-pulse" />
            <div className="relative bg-green-500/10 p-6 rounded-full border border-green-500/20">
              <CheckCircle2 className="h-16 w-16 text-green-500 stroke-[1.5px]" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-4xl font-black tracking-tight text-foreground bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
              {title}
            </h2>
            <p className="text-lg text-muted-foreground font-medium max-w-[320px] mx-auto leading-relaxed">
              {message}
            </p>
          </div>

          <Button 
            onClick={handleClose}
            className="w-full h-14 bg-green-600 hover:bg-green-700 text-white text-lg font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-green-900/20 hover:shadow-green-900/30"
          >
            Great!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
