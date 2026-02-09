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

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];

interface PaginationControlsProps {
  pageSize: number;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  onPageSizeChange: (size: number) => void;
  onPageChange: (page: number) => void;
}

export function SalesOrderPaginationControls({
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
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            Rows per page:
          </span>
          <Select
            value={pageSize.toString()}
            onValueChange={(val) => onPageSizeChange(Number(val))}
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
        <span className="text-muted-foreground text-sm">
          {totalCount > 0 ? `${totalCount} records` : "No records"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">Page</span>
        <PageInput
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
        <span className="text-muted-foreground text-sm">/ {totalPages}</span>
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
    </div>
  );
}

interface PageInputProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function PageInput({
  currentPage,
  totalPages,
  onPageChange,
}: PageInputProps) {
  const [inputValue, setInputValue] = useState(currentPage.toString());

  useEffect(() => {
    setInputValue(currentPage.toString());
  }, [currentPage]);

  const handleBlur = () => {
    const page = parseInt(inputValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    } else {
      setInputValue(currentPage.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleBlur();
  };

  return (
    <Input
      type="number"
      min={1}
      max={totalPages}
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="h-9 w-16 text-center text-sm"
    />
  );
}
