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
  /** When true, show clear icon only on hover. When false, show whenever value exists. */
  showOnHoverOnly?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ClearableField({
  children,
  value,
  onClear,
  showOnHoverOnly = true,
  disabled = false,
  className,
}: ClearableFieldProps) {
  const hasValue = value !== undefined && value !== null && value !== "";

  return (
    <div
      className={cn(
        "group/clearable flex items-center gap-1",
        className,
      )}
    >
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
          "text-muted-foreground hover:text-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
          !hasValue && "invisible w-0 p-0",
          hasValue && showOnHoverOnly && "opacity-0 group-hover/clearable:opacity-100",
          hasValue && !showOnHoverOnly && "opacity-100",
        )}
        aria-label="Clear selection"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
