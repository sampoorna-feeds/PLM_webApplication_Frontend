"use client";

/**
 * PO Attachment Dialog
 * Allows uploading PDF files to an existing purchase order.
 * Files are base64-encoded client-side before being sent to the API.
 */

import React, { useCallback, useRef, useState } from "react";
import { Loader2, Paperclip, UploadCloud, X, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { uploadPurchaseAttachment } from "@/lib/api/services/purchase-order.service";

interface FileEntry {
  id: string;
  file: File;
  status: "idle" | "uploading" | "success" | "error";
  error?: string;
}

interface POAttachmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  orderNo: string;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix → keep only the base64 portion
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function POAttachmentDialog({
  isOpen,
  onOpenChange,
  orderNo,
}: POAttachmentDialogProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const pdfs = Array.from(files).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    if (pdfs.length === 0) return;
    setEntries((prev) => [
      ...prev,
      ...pdfs.map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        status: "idle" as const,
      })),
    ]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(e.target.files);
      e.target.value = "";
    },
    [addFiles],
  );

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const uploadEntry = async (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry || entry.status === "uploading" || entry.status === "success") return;

    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "uploading", error: undefined } : e)),
    );

    try {
      const base64 = await readFileAsBase64(entry.file);
      await uploadPurchaseAttachment(orderNo, entry.file.name, base64);
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "success" } : e)),
      );
    } catch (err) {
      const msg =
        err && typeof (err as any).message === "string"
          ? (err as any).message
          : "Upload failed";
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "error", error: msg } : e)),
      );
    }
  };

  const uploadAll = () => {
    entries.forEach((e) => {
      if (e.status === "idle" || e.status === "error") {
        uploadEntry(e.id);
      }
    });
  };

  const pendingCount = entries.filter(
    (e) => e.status === "idle" || e.status === "error",
  ).length;
  const isAnyUploading = entries.some((e) => e.status === "uploading");

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Attachments — {orderNo}
          </DialogTitle>
        </DialogHeader>

        {/* Drop Zone */}
        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          } cursor-pointer`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <UploadCloud className="text-muted-foreground h-8 w-8" />
          <div>
            <p className="text-sm font-medium">Drop PDFs here or click to browse</p>
            <p className="text-muted-foreground text-xs">Only PDF files are accepted</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            onChange={handleInputChange}
          />
        </div>

        {/* File List */}
        {entries.length > 0 && (
          <div className="space-y-1.5">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-muted/40 flex items-center gap-2 rounded-md border px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.file.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {(entry.file.size / 1024).toFixed(1)} KB
                  </p>
                  {entry.status === "error" && (
                    <p className="text-destructive text-xs">{entry.error}</p>
                  )}
                </div>

                {entry.status === "uploading" && (
                  <Loader2 className="text-primary h-4 w-4 shrink-0 animate-spin" />
                )}
                {entry.status === "success" && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                )}
                {entry.status === "error" && (
                  <AlertCircle className="text-destructive h-4 w-4 shrink-0" />
                )}

                {entry.status !== "uploading" && entry.status !== "success" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => uploadEntry(entry.id)}
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                  </Button>
                )}

                {entry.status !== "uploading" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-7 w-7 shrink-0"
                    onClick={() => removeEntry(entry.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {pendingCount > 0 && (
          <Button
            type="button"
            onClick={uploadAll}
            disabled={isAnyUploading}
            className="w-full"
          >
            {isAnyUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload {pendingCount} file{pendingCount !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        )}

        {entries.length === 0 && (
          <p className="text-muted-foreground text-center text-xs">
            No files selected yet.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
