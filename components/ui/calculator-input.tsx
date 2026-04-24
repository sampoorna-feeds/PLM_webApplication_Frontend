"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface CalculatorInputProps
  extends Omit<React.ComponentProps<typeof Input>, "onChange"> {
  onValueChange?: (value: string) => void;
  // Triggered only after Enter or Blur, with the evaluated result
  onCommit?: (value: string) => void;
  // If true, the input will only allow numerical characters and math operators
  strict?: boolean;
}

/**
 * A specialized numerical input that evaluates mathematical expressions
 * when the user presses Enter or the input loses focus.
 * Supports +, -, *, /
 */
export const CalculatorInput = React.forwardRef<
  HTMLInputElement,
  CalculatorInputProps
>(({ className, value, onValueChange, onCommit, onBlur, onKeyDown, strict = true, ...props }, ref) => {
  const [inputValue, setInputValue] = React.useState<string>(String(value || ""));

  // Sync with external value changes
  React.useEffect(() => {
    setInputValue(String(value || ""));
  }, [value]);

  const evaluateExpression = (val: string) => {
    if (!val) return "";
    
    // Cleanup: remove spaces, allow only digits, operators and dot
    const cleaned = val.replace(/\s+/g, "");
    
    // Basic validation: must contain at least one operator to be an expression, 
    // otherwise it's just a number.
    if (!/[\+\-\*\/]/.test(cleaned)) return cleaned;

    try {
      // Safe evaluation using Function constructor (better than eval but still use with caution)
      // We only allow math characters so it's safe.
      if (/^[0-9\+\-\*\/\.\(\)]+$/.test(cleaned)) {
        // eslint-disable-next-line no-new-func
        const result = new Function(`return ${cleaned}`)();
        if (typeof result === "number" && isFinite(result)) {
          // Format to a reasonable number of decimals if needed, or keep as is
          const finalResult = String(Number(result.toFixed(4)));
          return finalResult;
        }
      }
    } catch (e) {
      console.warn("CalculatorInput: Failed to evaluate expression", val);
    }
    
    return val; // Return original if evaluation fails
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const result = evaluateExpression(inputValue);
    if (result !== inputValue) {
      setInputValue(result);
      onValueChange?.(result);
    }
    onCommit?.(result);
    onBlur?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const result = evaluateExpression(inputValue);
      if (result !== inputValue) {
        setInputValue(result);
        onValueChange?.(result);
      }
      onCommit?.(result);
      // Prevent form submission if inside a form
      e.preventDefault();
    }
    onKeyDown?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    
    if (strict) {
      // Only allow math-related characters in strict mode
      if (/^[0-9\+\-\*\/\.\(\)\s]*$/.test(newVal)) {
        setInputValue(newVal);
        onValueChange?.(newVal);
      }
    } else {
      setInputValue(newVal);
      onValueChange?.(newVal);
    }
  };

  return (
    <Input
      {...props}
      ref={ref}
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn("tabular-nums", className)}
    />
  );
});

CalculatorInput.displayName = "CalculatorInput";
