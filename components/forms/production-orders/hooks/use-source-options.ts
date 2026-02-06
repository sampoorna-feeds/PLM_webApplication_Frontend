/**
 * useSourceOptions Hook
 * Encapsulates source dropdown logic for Production Order form
 * following Single Responsibility Principle
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getItems,
  getFamilies,
  getSalesHeaders,
  getItemByNo,
  type Item,
  type Family,
  type SalesHeader,
} from "@/lib/api/services/production-order-data.service";
import type { SourceType } from "../types";

export type SourceOption = Item | Family | SalesHeader;

interface UseSourceOptionsParams {
  sourceType: SourceType;
  sourceNo: string;
  lobCode: string;
  isViewMode: boolean;
}

interface UseSourceOptionsReturn {
  sourceOptions: SourceOption[];
  setSourceOptions: React.Dispatch<React.SetStateAction<SourceOption[]>>;
  isLoadingSource: boolean;
  isLoadingMoreSource: boolean;
  hasMoreSource: boolean;
  searchQuery: string;
  handleSearch: (query: string) => void;
  handleLoadMore: () => void;
  handleSourceChange: (
    value: string,
    onSelect: (item: SourceOption | null) => void
  ) => Promise<void>;
}

const PAGE_SIZE = 50;

export function useSourceOptions({
  sourceType,
  sourceNo,
  lobCode,
  isViewMode,
}: UseSourceOptionsParams): UseSourceOptionsReturn {
  const [sourceOptions, setSourceOptions] = useState<SourceOption[]>([]);
  const [isLoadingSource, setIsLoadingSource] = useState(false);
  const [isLoadingMoreSource, setIsLoadingMoreSource] = useState(false);
  const [hasMoreSource, setHasMoreSource] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Load source options when source type, search query, or page changes
  useEffect(() => {
    if (!sourceType || isViewMode) {
      if (!isViewMode) {
        setSourceOptions([]);
        setHasMoreSource(false);
      }
      return;
    }

    const loadSourceOptions = async () => {
      const isLoadMore = page > 1;

      if (isLoadMore) {
        setIsLoadingMoreSource(true);
      } else {
        setIsLoadingSource(true);
      }

      try {
        let options: SourceOption[] = [];

        switch (sourceType) {
          case "Item": {
            const skip = (page - 1) * PAGE_SIZE;
            options = await getItems(
              searchQuery || undefined,
              lobCode,
              skip,
              PAGE_SIZE
            );
            setHasMoreSource(options.length === PAGE_SIZE);
            break;
          }
          case "Family":
            options = await getFamilies(searchQuery || undefined);
            setHasMoreSource(false);
            break;
          case "Sales Header":
            options = await getSalesHeaders(searchQuery || undefined);
            setHasMoreSource(false);
            break;
        }

        // Ensure selected item is always in options if it exists
        if (
          !isLoadMore &&
          sourceNo &&
          !options.some((opt) => opt.No === sourceNo)
        ) {
          try {
            let selectedItem: SourceOption | null = null;
            switch (sourceType) {
              case "Item":
                selectedItem = await getItemByNo(sourceNo);
                break;
              case "Family":
                selectedItem = {
                  No: sourceNo,
                  Description: sourceNo,
                } as Family;
                break;
              case "Sales Header":
                selectedItem = {
                  No: sourceNo,
                  Sell_to_Customer_Name: sourceNo,
                } as SalesHeader;
                break;
            }

            if (selectedItem) {
              options = [selectedItem, ...options];
            }
          } catch (error) {
            console.warn("Could not fetch selected item:", error);
          }
        }

        if (isLoadMore) {
          setSourceOptions((prev) => [...prev, ...options]);
        } else {
          setSourceOptions(options);
        }
      } catch (error) {
        console.error("Error loading source options:", error);
        if (!isLoadMore) {
          setSourceOptions([]);
        }
      } finally {
        setIsLoadingSource(false);
        setIsLoadingMoreSource(false);
      }
    };

    loadSourceOptions();
  }, [sourceType, sourceNo, lobCode, searchQuery, page, isViewMode]);

  // Reset page when source type or search changes
  useEffect(() => {
    setPage(1);
    setSourceOptions([]);
  }, [sourceType]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!hasMoreSource || isLoadingMoreSource) return;
    setPage((prev) => prev + 1);
  }, [hasMoreSource, isLoadingMoreSource]);

  // Handle source selection with async item details fetching
  const handleSourceChange = useCallback(
    async (
      value: string,
      onSelect: (item: SourceOption | null) => void
    ): Promise<void> => {
      // Find existing option or create temporary one
      let selectedOption = sourceOptions.find((opt) => opt.No === value);

      if (!selectedOption) {
        // Create temporary option for immediate display
        if (sourceType === "Item") {
          selectedOption = { No: value, Description: `Loading ${value}...` } as Item;
        } else if (sourceType === "Family") {
          selectedOption = { No: value, Description: `Loading ${value}...` } as Family;
        } else if (sourceType === "Sales Header") {
          selectedOption = { No: value, Sell_to_Customer_Name: `Loading ${value}...` } as SalesHeader;
        }

        if (selectedOption) {
          setSourceOptions((prev) => [selectedOption!, ...prev]);
        }
      } else {
        // Move existing option to top
        setSourceOptions((prev) => {
          const filtered = prev.filter((opt) => opt.No !== value);
          return [selectedOption!, ...filtered];
        });
      }

      // Fetch full item details asynchronously
      if (sourceType === "Item") {
        try {
          const item = await getItemByNo(value);
          if (item) {
            setSourceOptions((prev) => {
              const filtered = prev.filter((opt) => opt.No !== value);
              return [item, ...filtered];
            });
            onSelect(item);
            return;
          }
        } catch (error) {
          console.error("Error fetching item details:", error);
        }
      }

      onSelect(selectedOption || null);
    },
    [sourceOptions, sourceType]
  );

  return {
    sourceOptions,
    setSourceOptions,
    isLoadingSource,
    isLoadingMoreSource,
    hasMoreSource,
    searchQuery,
    handleSearch,
    handleLoadMore,
    handleSourceChange,
  };
}
