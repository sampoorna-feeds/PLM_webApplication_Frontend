import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Identify numerical fields by type, class, or content pattern
    const isNumerical =
      type === "number" ||
      className?.includes("tabular-nums") ||
      (e.target.value && /^-?\d*\.?\d*$/.test(e.target.value));

    if (isNumerical && !props.readOnly && !props.disabled) {
      // Small timeout to ensure selection happens after browser's default focus behavior
      setTimeout(() => {
        e.target.select();
      }, 0);
    }
    props.onFocus?.(e);
  };

  return (
    <input
      type={type}
      data-slot="input"
      onFocus={handleFocus}
      className={cn(
        "dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 file:text-foreground placeholder:text-muted-foreground h-9 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/50 aria-invalid:ring-[3px] md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
