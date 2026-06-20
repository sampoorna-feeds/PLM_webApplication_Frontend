"use client";

/**
 * Voucher Attachment Dialog
 * Allows uploading PDF/JPG/PNG files to an existing voucher journal line.
 * Files are base64-encoded client-side before being sent to the API.
 * Also fetches currently added attachments and allows downloading them.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, UploadCloud, X, CheckCircle2, AlertCircle, Eye, FileText, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  uploadVoucherAttachment,
  getVoucherAttachments,
  downloadVoucherAttachment,
  deleteVoucherAttachment,
  type VoucherAttachment,
} from "@/lib/api/services/voucher.service";

interface FileEntry {
  id: string;
  file: File;
  status: "idle" | "uploading" | "success" | "error";
  error?: string;
}

interface VoucherAttachmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  voucherNo: string;
  readOnly?: boolean;
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

export function VoucherAttachmentDialog({
  isOpen,
  onOpenChange,
  voucherNo,
  readOnly = false,
}: VoucherAttachmentDialogProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<VoucherAttachment[]>([]);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadExistingAttachments = useCallback(async () => {
    if (!voucherNo) return;
    setIsLoadingExisting(true);
    try {
      const list = await getVoucherAttachments(voucherNo);
      setExistingAttachments(list);
    } catch (err) {
      console.error("Failed to load existing attachments:", err);
    } finally {
      setIsLoadingExisting(false);
    }
  }, [voucherNo]);

  useEffect(() => {
    if (isOpen && voucherNo) {
      loadExistingAttachments();
      setEntries([]);
    }
  }, [isOpen, voucherNo, loadExistingAttachments]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(
      (f) =>
        f.type === "application/pdf" ||
        f.type === "image/jpeg" ||
        f.type === "image/png" ||
        f.name.toLowerCase().endsWith(".pdf") ||
        f.name.toLowerCase().endsWith(".jpg") ||
        f.name.toLowerCase().endsWith(".jpeg") ||
        f.name.toLowerCase().endsWith(".png"),
    );
    if (validFiles.length === 0) return;
    setEntries((prev) => [
      ...prev,
      ...validFiles.map((f) => ({
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
      await uploadVoucherAttachment(voucherNo, entry.file.name, base64);
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "success" } : e)),
      );
      void loadExistingAttachments();
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

  const handleView = async (attachment: VoucherAttachment) => {
    setDownloadingId(attachment.ID);
    try {
      const base64 = await downloadVoucherAttachment(
        attachment.ID,
        attachment.No,
        attachment.File_Extension,
      );

      if (!base64) {
        throw new Error("No file content received.");
      }

      // Convert base64 to blob and open in a new tab
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      
      let contentType = "application/octet-stream";
      const ext = attachment.File_Extension.toLowerCase();
      if (ext === "pdf") {
        contentType = "application/pdf";
      } else if (ext === "jpg" || ext === "jpeg") {
        contentType = "image/jpeg";
      } else if (ext === "png") {
        contentType = "image/png";
      }

      const blob = new Blob([byteArray], { type: contentType });
      const url = URL.createObjectURL(blob);
      
      // Open the Blob URL directly in a new tab
      window.open(url, "_blank");
    } catch (err) {
      console.error("Failed to view attachment:", err);
      alert("Failed to view attachment. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (attachment: VoucherAttachment) => {
    if (!window.confirm(`Are you sure you want to delete "${attachment.Name}"?`)) {
      return;
    }
    setDeletingId(attachment.ID);
    try {
      await deleteVoucherAttachment(attachment.ID, attachment.No);
      void loadExistingAttachments();
    } catch (err) {
      console.error("Failed to delete attachment:", err);
      alert("Failed to delete attachment. Please try again.");
    } finally {
      setDeletingId(null);
    }
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
            Attachments — {voucherNo}
          </DialogTitle>
        </DialogHeader>

        {!readOnly && (
          <>
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
                <p className="text-sm font-medium">Drop PDFs or Images here or click to browse</p>
                <p className="text-muted-foreground text-xs">PDF, JPG, JPEG, and PNG files are accepted</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf,.jpg,.jpeg,image/jpeg,.png,image/png"
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
                      <p className="text-muted-foreground text-[10px]">
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
          </>
        )}

        {/* Previously Added Attachments Section */}
        <div className={`space-y-2 ${readOnly ? "" : "border-t pt-4 mt-2"}`}>
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-foreground/80">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            {readOnly ? "Attachments" : "Previously Added Attachments"}
          </h3>

          {isLoadingExisting ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading attachments...
            </div>
          ) : existingAttachments.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-4 bg-muted/20 rounded-md border border-dashed">
              No attachments found.
            </p>
          ) : (
            <div className={`${readOnly ? "max-h-[350px]" : "max-h-[160px]"} overflow-y-auto space-y-1.5 pr-1`}>
              {existingAttachments.map((att) => (
                <div
                  key={att.ID}
                  className="bg-muted/40 hover:bg-muted/60 flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 transition-colors"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-primary/70" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground" title={att.Name}>
                        {att.Name}
                      </p>
                      <p className="text-muted-foreground text-[10px] uppercase">
                        {att.File_Extension}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 hover:text-primary hover:bg-primary/5"
                      disabled={downloadingId === att.ID || deletingId === att.ID}
                      onClick={() => handleView(att)}
                      title="View Attachment"
                    >
                      {downloadingId === att.ID ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>

                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 hover:text-destructive hover:bg-destructive/5 text-muted-foreground"
                        disabled={downloadingId === att.ID || deletingId === att.ID}
                        onClick={() => handleDelete(att)}
                        title="Delete Attachment"
                      >
                        {deletingId === att.ID ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
