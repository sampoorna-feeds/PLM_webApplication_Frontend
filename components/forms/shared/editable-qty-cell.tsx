"use client";

import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface EditableQtyCellProps {
  value: number | null | undefined;
  onChange: (next: number) => void;
  disabled?: boolean;
  isDirty?: boolean;
  className?: string;
}

export function EditableQtyCell({
  value,
  onChange,
  disabled = false,
  isDirty = false,
  className,
}: EditableQtyCellProps) {
  const [text, setText] = useState<string>(value == null ? "" : String(value));
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setText(value == null ? "" : String(value));
    }
  }, [value]);

  if (disabled) {
    return (
      <TableCell className={cn("text-right text-xs", className)}>
        {value ?? "-"}
      </TableCell>
    );
  }

  return (
    <TableCell
      className={cn("text-right text-xs p-1", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <Input
        type="text"
        inputMode="decimal"
        value={text}
        onFocus={() => {
          isFocused.current = true;
        }}
        onChange={(e) => {
          setText(e.target.value);
          const next = parseFloat(e.target.value);
          if (!Number.isNaN(next)) onChange(next);
        }}
        onBlur={(e) => {
          isFocused.current = false;
          const parsed = parseFloat(e.target.value);
          if (Number.isNaN(parsed)) {
            setText(value == null ? "" : String(value));
          } else {
            setText(String(parsed));
          }
        }}
        className={cn(
          "h-7 text-right text-xs",
          isDirty
            ? "border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-950/30"
            : "border-transparent bg-transparent focus:border-input focus:bg-background",
        )}
      />
    </TableCell>
  );
}
