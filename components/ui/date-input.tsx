"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";
import { toast } from "sonner";

interface DateInputProps {
  value?: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  min?: string;
  max?: string;
  required?: boolean;
}

/**
 * User-friendly date input that accepts multiple formats:
 * - DD/MM/YYYY (e.g., 17/02/2026)
 * - DD-MM-YYYY (e.g., 17-02-2026)
 * - DDMMYYYY (e.g., 17022026)
 * - Also supports native date picker on click
 */
export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      value,
      onChange,
      placeholder = "DD/MM/YYYY",
      disabled = false,
      className,
      id,
      min,
      max,
      required = false,
    },
    ref
  ) => {
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

  const isValidDate = (year: number, month: number, day: number) => {
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  };

  const parseUserInput = (input: string): string | null => {
    const cleaned = input.replace(/\s/g, "");

    // Try DD/MM/YYYY or DD-MM-YYYY
    const slashDashPattern = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    let match = cleaned.match(slashDashPattern);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);
      if (isValidDate(year, month, day)) {
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }

    // Try DDMMYYYY
    const compactPattern = /^(\d{2})(\d{2})(\d{4})$/;
    match = cleaned.match(compactPattern);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);
      if (isValidDate(year, month, day)) {
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }

    // Try YYYY-MM-DD or YYYY/MM/DD
    const isoPattern = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
    match = cleaned.match(isoPattern);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);
      if (isValidDate(year, month, day)) {
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }

    return null;
  };

  const formatAsYouType = (input: string) => {
    // Remove all non-digits
    const digits = input.replace(/\D/g, "");
    const truncated = digits.slice(0, 8);
    
    let formatted = "";
    if (truncated.length > 0) {
      formatted += truncated.slice(0, 2);
      if (truncated.length > 2) {
        formatted += "/" + truncated.slice(2, 4);
        if (truncated.length > 4) {
          formatted += "/" + truncated.slice(4, 8);
        }
      }
    }
    return formatted;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    const formatted = formatAsYouType(input);
    setDisplayValue(formatted);

    // If fully typed, validate immediately
    if (formatted.length === 10) {
      const parsed = parseUserInput(formatted);
      if (!parsed) {
        toast.error("Invalid date value");
        setDisplayValue("");
        onChange("");
      }
    }
  };

  const handleBlur = () => {
    if (!displayValue.trim()) {
      onChange("");
      return;
    }

    const parsedDate = parseUserInput(displayValue);
    if (parsedDate) {
      // Check min/max range for manual entry
      if (min && min !== "0001-01-01" && parsedDate < min) {
        toast.error(`Selected date cannot be before ${min}`);
        setDisplayValue("");
        onChange("");
        return;
      }
      if (max && max !== "0001-01-01" && parsedDate > max) {
        toast.error(`Selected date cannot be after ${max}`);
        setDisplayValue("");
        onChange("");
        return;
      }

      onChange(parsedDate);
      // Update display to standardized format
      const parts = parsedDate.split("-");
      setDisplayValue(`${parts[2]}/${parts[1]}/${parts[0]}`);
    } else {
      toast.error("Invalid date");
      setDisplayValue("");
      onChange("");
    }
  };

  const revertToPrevious = () => {
    // Invalid format or out of range - revert to previous value or clear
    if (value && value !== "0001-01-01") {
      const parts = value.split("-");
      setDisplayValue(`${parts[2]}/${parts[1]}/${parts[0]}`);
    } else {
      setDisplayValue("");
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
        ref={ref}
        id={id}
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={cn("pr-9", className)}
      />
      <button
        type="button"
        onClick={handleCalendarClick}
        disabled={disabled}
        className="text-muted-foreground hover:text-foreground absolute top-0 right-0 flex h-full items-center px-3"
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
        min={min === "0001-01-01" ? undefined : min}
        max={max === "0001-01-01" ? undefined : max}
        className="pointer-events-none absolute inset-0 opacity-0"
        tabIndex={-1}
      />
    </div>
  );
});

DateInput.displayName = "DateInput";
