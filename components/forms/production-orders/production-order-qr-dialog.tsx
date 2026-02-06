"use client";

import { useState, useEffect } from "react";
import { QrCode, Loader2, Download, Printer } from "lucide-react";
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

export function ProductionOrderQRDialog({
  prodOrderNo,
}: ProductionOrderQRDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Clean up blob URL on unmount or when URL changes to prevent memory leaks
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Fetch PDF when dialog opens
  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !pdfUrl) {
      loadPdf();
    }
    if (!isOpen && pdfUrl) {
      // Revoke the old URL when dialog closes so it can be re-fetched fresh next time
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
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

  const handlePrint = () => {
    if (!pdfUrl) return;

    // Create a hidden iframe to print the PDF
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "none";
    printFrame.src = pdfUrl;

    document.body.appendChild(printFrame);

    printFrame.onload = () => {
      try {
        printFrame.contentWindow?.print();
      } catch (error) {
        console.error("Error printing:", error);
        // Fallback: open in new tab for printing
        window.open(pdfUrl, "_blank");
      }
      // Remove iframe after a delay
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 1000);
    };
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" data-qr-trigger>
          <QrCode className="mr-2 h-4 w-4" />
          QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[80vh] flex-col sm:max-w-200">
        <DialogHeader>
          <DialogTitle>QR Code</DialogTitle>
          <DialogDescription>Production Order {prodOrderNo}</DialogDescription>
        </DialogHeader>

        <div className="bg-muted relative w-full flex-1 overflow-hidden rounded-md">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
              className="h-full w-full border-none"
              title="QR Code PDF"
            />
          ) : (
            <div className="text-muted-foreground absolute inset-0 flex items-center justify-center">
              Failed to load PDF
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={!pdfUrl || isLoading}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleDownload} disabled={!pdfUrl || isLoading}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
