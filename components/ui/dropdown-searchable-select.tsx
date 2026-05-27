"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Search, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";

export interface DropdownSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface DropdownSearchableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: DropdownSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  hideClear?: boolean;
  hideChevron?: boolean;
}

export function DropdownSearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  isLoading = false,
  className,
  hideClear = false,
  hideChevron = false,
}: DropdownSearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const isKeyboardActionRef = useRef(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset states when closed
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setShowSearch(false);
      setActiveIndex(-1);
    }
    isKeyboardActionRef.current = false;
  }, [open]);

  // Focus management on open
  useEffect(() => {
    if (open) {
      if (showSearch) {
        // Focus the search input if search is active
        const timer = setTimeout(() => {
          inputRef.current?.focus();
          // Ensure cursor is at the end
          if (inputRef.current) {
            const val = inputRef.current.value;
            inputRef.current.value = "";
            inputRef.current.value = val;
          }
        }, 50);
        return () => clearTimeout(timer);
      } else {
        // Otherwise, focus the content listbox container so it catches keyboard events
        const timer = setTimeout(() => {
          contentRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [open, showSearch]);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opt.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opt.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Key handlers for trigger button
  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    } else if (e.key.length === 1 && /^[a-zA-Z0-9]$/.test(e.key)) {
      // If user starts typing alphanumeric key directly on trigger
      e.preventDefault();
      setSearchQuery(e.key);
      setShowSearch(true);
      setOpen(true);
    }
  };

  // Key handler for Popover Content (when focus is on the list, not the search input)
  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || isLoading) return;

    // Detect typing to show search input
    if (!showSearch && e.key.length === 1 && /^[a-zA-Z0-9]$/.test(e.key)) {
      e.preventDefault();
      setSearchQuery(e.key);
      setShowSearch(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      isKeyboardActionRef.current = true;
      setActiveIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      isKeyboardActionRef.current = true;
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        onValueChange(filteredOptions[activeIndex].value);
        setOpen(false);
        triggerRef.current?.focus();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  // Key handler for search input inside popover
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent event from bubbling up to contentRef onKeyDown handler which also maps these navigation keys.
    if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
      e.stopPropagation();
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      isKeyboardActionRef.current = true;
      setActiveIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      isKeyboardActionRef.current = true;
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        onValueChange(filteredOptions[activeIndex].value);
        setOpen(false);
        triggerRef.current?.focus();
      } else if (filteredOptions.length > 0) {
        // Default to first match if enter is pressed and no active index
        onValueChange(filteredOptions[0].value);
        setOpen(false);
        triggerRef.current?.focus();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "Backspace" && searchQuery.length <= 1) {
      // If query is cleared via backspace, hide the search bar
      setSearchQuery("");
      setShowSearch(false);
    }
  };

  // Scroll active option into view
  useEffect(() => {
    if (open && activeIndex >= 0 && listRef.current && isKeyboardActionRef.current) {
      const listElement = listRef.current;
      const optionElements = listElement.querySelectorAll('[role="option"]');
      const activeElement = optionElements[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex, open]);

  const handleListWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    if (element.scrollHeight <= element.clientHeight) return;
    e.preventDefault();
    e.stopPropagation();
    element.scrollTop += e.deltaY;
  };

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : value || placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverAnchor asChild>
        <div className="relative w-full">
          <Button
            ref={triggerRef}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || isLoading}
            onKeyDown={handleTriggerKeyDown}
            onClick={() => setOpen((prev) => !prev)}
            className={cn(
              "h-8 w-full justify-between bg-background px-3 text-[13px] font-medium text-left truncate shadow-none border border-input hover:bg-accent/50",
              (!hideClear && value && !disabled) ? "pr-12" : "pr-8",
              !value && "text-muted-foreground",
              className
            )}
          >
            <span className="truncate">{displayLabel}</span>
          </Button>
          <div className="absolute right-0 top-0 flex h-full items-center gap-1.5 px-3 pointer-events-none">
            {value && !disabled && !hideClear && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onValueChange("");
                  setTimeout(() => triggerRef.current?.focus(), 0);
                }}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors rounded-full pointer-events-auto"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            {!hideChevron && (
              <ChevronDown className="h-4 w-4 shrink-0 opacity-40" />
            )}
          </div>
        </div>
      </PopoverAnchor>

      <PopoverContent
        ref={contentRef}
        tabIndex={showSearch ? -1 : 0}
        onKeyDown={handleContentKeyDown}
        className="flex max-h-[var(--radix-popover-content-available-height,80vh)] min-h-0 w-[var(--radix-popover-anchor-width)] max-w-[calc(100vw-2rem)] min-w-[200px] flex-col overflow-hidden p-0 shadow-xl focus:outline-none"
        align="start"
        sideOffset={4}
        collisionPadding={8}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          triggerRef.current?.focus();
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Conditionally rendered search bar */}
          {showSearch && (
            <div className="relative flex items-center border-b px-2 py-1.5 bg-muted/20 shrink-0">
              <Search className="h-3.5 w-3.5 text-muted-foreground mr-1.5 shrink-0" />
              <Input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveIndex(-1);
                }}
                onKeyDown={handleInputKeyDown}
                placeholder={searchPlaceholder}
                className="h-7 text-[13px] bg-background pr-6 border-none focus-visible:ring-0"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setShowSearch(false);
                }}
                className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div
            ref={listRef}
            className="min-h-0 flex-1 overflow-y-auto p-1"
            data-scroll-lock-ignore
            onWheel={handleListWheel}
          >
            {filteredOptions.length === 0 ? (
              <div className="text-muted-foreground py-4 text-center text-[13px]">
                No results found
              </div>
            ) : (
              filteredOptions.map((option, idx) => {
                const isSelected = value === option.value;
                const isFocused = activeIndex === idx;
                return (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "group relative flex cursor-pointer items-start rounded-sm px-2 py-1.5 text-[13px] transition-colors outline-none select-none",
                      isSelected
                        ? "bg-primary text-primary-foreground hover:bg-primary/95"
                        : isFocused
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                    onClick={() => {
                      onValueChange(option.value);
                      setOpen(false);
                      triggerRef.current?.focus();
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3.5 w-3.5 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex min-w-0 flex-1 flex-col text-left">
                      <span className="block w-full truncate font-medium">
                        {option.label}
                      </span>
                      {option.description && (
                        <span
                          className={cn(
                            "text-[11px] truncate",
                            isSelected
                              ? "text-primary-foreground/80"
                              : isFocused
                              ? "text-accent-foreground/80"
                              : "text-muted-foreground"
                          )}
                        >
                          {option.description}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
