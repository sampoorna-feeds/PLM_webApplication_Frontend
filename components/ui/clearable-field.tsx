"use client";

/**
 * ClearableField - Wraps a field with a clear/reset icon
 * Icon appears outside the field (right side), visible when value exists or on hover
 */

import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClearableFieldProps {
  children: React.ReactNode;
  value?: string | number | boolean;
  onClear: () => void;
  /**
   * When true, the clear button is never rendered (use in view-only mode).
   * When false (default), the button is always visible when the field has a value.
   */
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ClearableField({
  children,
  value,
  onClear,
  readOnly = false,
  disabled = false,
  className,
}: ClearableFieldProps) {
  const hasValue = value !== undefined && value !== null && value !== "";

  if (readOnly) {
    return <>{children}</>;
  }

  return (
    <div className={cn("group/clearable flex items-center gap-1", className)}>
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) onClear();
        }}
        disabled={disabled || !hasValue}
        className={cn(
          "text-muted-foreground hover:text-foreground hover:bg-muted/80 focus:ring-ring flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors focus:ring-2 focus:ring-offset-1 focus:outline-none disabled:pointer-events-none disabled:opacity-30",
          !hasValue || disabled ? "invisible w-0 p-0" : "opacity-100",
        )}
        aria-label="Clear selection"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
