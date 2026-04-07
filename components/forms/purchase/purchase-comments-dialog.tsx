"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Loader2, Plus, Pencil, Trash2, Check, X, CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  getPurchaseComments,
  createPurchaseComment,
  updatePurchaseComment,
  deletePurchaseComment,
  type PurchaseComment,
  type PurchaseCommentDocumentType,
} from "@/lib/api/services/purchase-comment.service";

interface PurchaseCommentsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: PurchaseCommentDocumentType;
  documentNo: string;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ── Inline form used for both Add and Edit ─────────────────────────────────
interface CommentFormProps {
  initialText?: string;
  initialDate?: string;
  isSaving: boolean;
  error: string | null;
  onSave: (text: string, date: string) => void;
  onCancel: () => void;
  autoFocus?: boolean;
}

const COMMENT_MAX = 80;

function CommentForm({
  initialText = "",
  initialDate,
  isSaving,
  error,
  onSave,
  onCancel,
  autoFocus = true,
}: CommentFormProps) {
  const [text, setText] = useState(initialText);
  const [date, setDate] = useState(initialDate ?? today());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const remaining = COMMENT_MAX - text.length;
  const isOverLimit = remaining < 0;

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Comment
        </Label>
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your comment here…"
          rows={3}
          maxLength={COMMENT_MAX}
          className={cn(
            "resize-none text-sm leading-relaxed",
            isOverLimit && "border-destructive focus-visible:ring-destructive",
          )}
        />
        <div className="flex justify-end">
          <span className={cn(
            "text-xs tabular-nums",
            remaining <= 10 ? "text-destructive font-medium" : "text-muted-foreground",
          )}>
            {text.length}/{COMMENT_MAX}
          </span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1.5 w-40">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            Date
          </Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-3"
            onClick={onCancel}
            disabled={isSaving}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 px-3"
            onClick={() => onSave(text.trim(), date)}
            disabled={isSaving || !text.trim() || isOverLimit}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Check className="h-3.5 w-3.5 mr-1" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-destructive text-xs bg-destructive/5 border border-destructive/20 rounded px-2 py-1">
          {error}
        </p>
      )}
    </div>
  );
}

// ── Main dialog ────────────────────────────────────────────────────────────
export function PurchaseCommentsDialog({
  isOpen,
  onOpenChange,
  documentType,
  documentNo,
}: PurchaseCommentsDialogProps) {
  const [comments, setComments] = useState<PurchaseComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [isSavingAdd, setIsSavingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingLineNo, setEditingLineNo] = useState<number | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingLineNo, setDeletingLineNo] = useState<number | null>(null);

  async function loadComments() {
    setIsLoading(true);
    setLoadError(null);
    try {
      setComments(await getPurchaseComments(documentType, documentNo));
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load comments");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen || !documentNo) return;
    loadComments();
    setIsAdding(false);
    setEditingLineNo(null);
  }, [isOpen, documentType, documentNo]);

  async function handleAdd(text: string, date: string) {
    setIsSavingAdd(true);
    setAddError(null);
    try {
      await createPurchaseComment(documentType, documentNo, text, date);
      setIsAdding(false);
      await loadComments();
    } catch (err: any) {
      setAddError(err?.message || "Failed to add comment");
    } finally {
      setIsSavingAdd(false);
    }
  }

  async function handleSaveEdit(comment: PurchaseComment, text: string, date: string) {
    setIsSavingEdit(true);
    setEditError(null);
    try {
      await updatePurchaseComment(documentType, documentNo, comment.Line_No, text, date, comment.Document_Line_No);
      setEditingLineNo(null);
      await loadComments();
    } catch (err: any) {
      setEditError(err?.message || "Failed to update comment");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDelete(comment: PurchaseComment) {
    setDeletingLineNo(comment.Line_No);
    try {
      await deletePurchaseComment(documentType, documentNo, comment.Line_No, comment.Document_Line_No);
      await loadComments();
    } catch {
      // reload will surface any issue
    } finally {
      setDeletingLineNo(null);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
            </span>
            <span>Comments</span>
            <span className="text-muted-foreground font-normal text-sm ml-0.5">
              — {documentNo}
            </span>
            {!isLoading && comments.length > 0 && (
              <span className="ml-auto text-xs font-medium bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                {comments.length}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="flex flex-col gap-3 px-5 py-4 overflow-y-auto max-h-[70vh]">

          {/* Add form / button */}
          {isAdding ? (
            <CommentForm
              isSaving={isSavingAdd}
              error={addError}
              onSave={handleAdd}
              onCancel={() => { setIsAdding(false); setAddError(null); }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className={cn(
                "flex items-center gap-2 w-full rounded-lg border border-dashed border-border",
                "px-4 py-2.5 text-sm text-muted-foreground",
                "hover:border-primary/50 hover:text-primary hover:bg-primary/5",
                "transition-colors duration-150"
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              Add comment
            </button>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error */}
          {!isLoading && loadError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive text-center">
              {loadError}
            </div>
          )}

          {/* Empty */}
          {!isLoading && !loadError && comments.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </span>
              <p className="text-sm text-muted-foreground">No comments yet</p>
            </div>
          )}

          {/* Comment list */}
          {!isLoading && !loadError && comments.length > 0 && (
            <div className="space-y-2">
              {comments.map((c) =>
                editingLineNo === c.Line_No ? (
                  <CommentForm
                    key={c.Line_No}
                    initialText={c.Comment}
                    initialDate={c.Date || today()}
                    isSaving={isSavingEdit}
                    error={editError}
                    onSave={(text, date) => handleSaveEdit(c, text, date)}
                    onCancel={() => { setEditingLineNo(null); setEditError(null); }}
                  />
                ) : (
                  <div
                    key={c.Line_No}
                    className="group relative rounded-lg border bg-card px-4 py-3 space-y-1.5 hover:border-border/80 transition-colors"
                  >
                    {/* Meta row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground/60 font-mono">
                          #{c.Line_No}
                        </span>
                        {c.Date && (
                          <>
                            <span className="text-muted-foreground/30 text-xs">·</span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(c.Date)}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Action buttons — visible on hover */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingLineNo(c.Line_No)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(c)}
                          disabled={deletingLineNo === c.Line_No}
                        >
                          {deletingLineNo === c.Line_No ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Comment text */}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {c.Comment || (
                        <span className="text-muted-foreground italic text-xs">No content</span>
                      )}
                    </p>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
