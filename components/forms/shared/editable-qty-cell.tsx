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
  const editedRef = useRef(false);

  useEffect(() => {
    if (!editedRef.current) {
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
        type="number"
        value={text}
        step="any"
        onChange={(e) => {
          editedRef.current = true;
          setText(e.target.value);
          const next = parseFloat(e.target.value);
          if (!Number.isNaN(next)) onChange(next);
        }}
        onBlur={() => {
          editedRef.current = false;
        }}
        className={cn(
          "h-7 text-right text-xs",
          isDirty && "border-amber-400 bg-amber-50",
        )}
      />
    </TableCell>
  );
}
