"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="flex items-center justify-between gap-4 pt-3">
      <div className="flex items-center gap-4">
        <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
        <span className="text-muted-foreground text-sm">
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
      <span className="text-muted-foreground text-sm">Rows per page:</span>
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
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-sm">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrevPage}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
