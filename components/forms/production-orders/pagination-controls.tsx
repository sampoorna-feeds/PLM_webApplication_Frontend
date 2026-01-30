"use client";

import { useState, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PageSize } from "./types";

const PAGE_SIZE_OPTIONS: PageSize[] = [10, 20, 30, 40, 50];

interface PaginationControlsProps {
  pageSize: PageSize;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  onPageSizeChange: (size: PageSize) => void;
  onPageChange: (page: number) => void;
}

export function PaginationControls({
  pageSize,
  currentPage,
  totalPages,
  totalCount,
  hasNextPage,
  onPageSizeChange,
  onPageChange,
}: PaginationControlsProps) {
  const hasPrevPage = currentPage > 1;

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex items-center gap-4">
        <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
        <span className="text-sm text-muted-foreground">
          {totalCount > 0 ? `${totalCount} records` : "No records"}
        </span>
      </div>
      <PageNavigator
        currentPage={currentPage}
        totalPages={totalPages}
        hasPrevPage={hasPrevPage}
        hasNextPage={hasNextPage}
        onPageChange={onPageChange}
      />
    </div>
  );
}

interface PageSizeSelectorProps {
  value: PageSize;
  onChange: (size: PageSize) => void;
}

function PageSizeSelector({ value, onChange }: PageSizeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Rows per page:</span>
      <Select
        value={value.toString()}
        onValueChange={(val) => onChange(Number(val) as PageSize)}
      >
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZE_OPTIONS.map((size) => (
            <SelectItem key={size} value={size.toString()}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface PageNavigatorProps {
  currentPage: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
}

function PageNavigator({
  currentPage,
  totalPages,
  hasPrevPage,
  hasNextPage,
  onPageChange,
}: PageNavigatorProps) {
  const [inputValue, setInputValue] = useState(currentPage.toString());

  // Sync input with current page when it changes externally
  useEffect(() => {
    setInputValue(currentPage.toString());
  }, [currentPage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const page = parseInt(inputValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    } else {
      // Reset to current page if invalid
      setInputValue(currentPage.toString());
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleInputBlur();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Page</span>
      <Input
        type="number"
        min={1}
        max={totalPages}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        className="w-16 h-9 text-center text-sm"
      />
      <span className="text-sm text-muted-foreground">/ {totalPages}</span>
      <Button
        variant="outline"
        size="icon"
        disabled={!hasPrevPage}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeftIcon className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        disabled={!hasNextPage}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ChevronRightIcon className="size-4" />
      </Button>
    </div>
  );
}
