"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

interface DateInputProps {
  value?: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * User-friendly date input that accepts multiple formats:
 * - DD/MM/YYYY (e.g., 17/02/2026)
 * - DD-MM-YYYY (e.g., 17-02-2026)
 * - DDMMYYYY (e.g., 17022026)
 * - Also supports native date picker on click
 */
export function DateInput({
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  disabled = false,
  className,
  id,
}: DateInputProps) {
  const [displayValue, setDisplayValue] = React.useState("");
  const nativeInputRef = React.useRef<HTMLInputElement>(null);

  // Convert YYYY-MM-DD to DD/MM/YYYY for display
  React.useEffect(() => {
    if (value) {
      const parts = value.split("-");
      if (parts.length === 3) {
        setDisplayValue(`${parts[2]}/${parts[1]}/${parts[0]}`);
      }
    } else {
      setDisplayValue("");
    }
  }, [value]);

  const parseUserInput = (input: string): string | null => {
    const cleaned = input.replace(/\s/g, "");

    // Try DD/MM/YYYY or DD-MM-YYYY
    const slashDashPattern = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    let match = cleaned.match(slashDashPattern);
    if (match) {
      const day = match[1].padStart(2, "0");
      const month = match[2].padStart(2, "0");
      const year = match[3];
      return `${year}-${month}-${day}`;
    }

    // Try DDMMYYYY
    const compactPattern = /^(\d{2})(\d{2})(\d{4})$/;
    match = cleaned.match(compactPattern);
    if (match) {
      const day = match[1];
      const month = match[2];
      const year = match[3];
      return `${year}-${month}-${day}`;
    }

    // Try YYYY-MM-DD or YYYY/MM/DD
    const isoPattern = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
    match = cleaned.match(isoPattern);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, "0");
      const day = match[3].padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    return null;
  };

  const handleBlur = () => {
    if (!displayValue.trim()) {
      onChange("");
      return;
    }

    const parsedDate = parseUserInput(displayValue);
    if (parsedDate) {
      onChange(parsedDate);
      // Update display to standardized format
      const parts = parsedDate.split("-");
      setDisplayValue(`${parts[2]}/${parts[1]}/${parts[0]}`);
    } else {
      // Invalid format - revert to previous value or clear
      if (value) {
        const parts = value.split("-");
        setDisplayValue(`${parts[2]}/${parts[1]}/${parts[0]}`);
      } else {
        setDisplayValue("");
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBlur();
    }
  };

  const handleCalendarClick = () => {
    nativeInputRef.current?.showPicker?.();
  };

  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        value={displayValue}
        onChange={(e) => setDisplayValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("pr-9", className)}
      />
      <button
        type="button"
        onClick={handleCalendarClick}
        disabled={disabled}
        className="text-muted-foreground hover:text-foreground absolute top-0 right-0 flex h-full items-center px-3 disabled:opacity-50"
        tabIndex={-1}
      >
        <Calendar className="h-4 w-4" />
      </button>
      {/* Hidden native date picker */}
      <input
        ref={nativeInputRef}
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="pointer-events-none absolute inset-0 opacity-0"
        tabIndex={-1}
      />
    </div>
  );
}
