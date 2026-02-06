"use client";

import { useState } from "react";
import { QrCode, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { printQRCode } from "@/lib/api/services/production-orders.service";
import { toast } from "sonner";

interface ProductionOrderQRDialogProps {
  prodOrderNo: string;
}

export function ProductionOrderQRDialog({ prodOrderNo }: ProductionOrderQRDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Fetch PDF when dialog opens
  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !pdfUrl) {
      loadPdf();
    }
  };

  const loadPdf = async () => {
    try {
      setIsLoading(true);
      const base64Data = await printQRCode(prodOrderNo);

      if (!base64Data) {
        toast.error("Failed to generate QR Code PDF");
        return;
      }

      // Convert Base64 to Blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (error) {
      console.error("Error loading QR Code:", error);
      toast.error("Error loading QR Code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const link = document.createElement("a");
    link.href = pdfUrl;
    // Clean filename
    const safeOrderNo = prodOrderNo.replace(/[^a-zA-Z0-9]/g, "_");
    link.download = `QR_${safeOrderNo}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" data-qr-trigger>
          <QrCode className="h-4 w-4 mr-2" />
          QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>QR Code</DialogTitle>
          <DialogDescription>
            Production Order {prodOrderNo}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 w-full bg-muted rounded-md overflow-hidden relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pdfUrl ? (
            <iframe 
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
              className="w-full h-full border-none" 
              title="QR Code PDF"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              Failed to load PDF
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleDownload} disabled={!pdfUrl || isLoading}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
