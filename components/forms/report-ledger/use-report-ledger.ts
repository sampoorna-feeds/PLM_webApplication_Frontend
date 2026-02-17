"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  getItemLedgerEntries,
  ItemLedgerEntry,
} from "@/lib/api/services/report-ledger.service";
import {
  getItemWiseStock,
  ItemWiseStock,
  getCalculatedOpeningBalance,
  getIncreaseMetrics,
  getDecreaseMetrics,
} from "@/lib/api/services/inventory.service";
import { getAllLOCsFromUserSetup } from "@/lib/api/services/dimension.service";
import { getItems } from "@/lib/api/services/production-order-data.service";
import type { PageSize, ReportLedgerFilters } from "./types";
import { EMPTY_FILTERS } from "./types";
import {
  type SortDirection,
  loadVisibleColumns,
  saveVisibleColumns,
  getDefaultVisibleColumns,
  buildSelectQuery,
  ALL_COLUMNS,
} from "./column-config";

const ITEM_PAGE_SIZE = 50;

export function useReportLedger() {
  const { userID } = useAuth();
  const [entries, setEntries] = useState<ItemLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters state
  const [filters, setFilters] = useState<ReportLedgerFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<ReportLedgerFilters>(EMPTY_FILTERS);

  // Metrics State (Enhanced: qty + amount for each)
  const [currentStock, setCurrentStock] = useState<ItemWiseStock | null>(null);
  const [openingBalance, setOpeningBalance] = useState<{
    qty: number;
    amount: number;
  } | null>(null);
  const [increaseMetrics, setIncreaseMetrics] = useState<{
    qty: number;
    amount: number;
  } | null>(null);
  const [decreaseMetrics, setDecreaseMetrics] = useState<{
    qty: number;
    amount: number;
  } | null>(null);
  const [closingBalance, setClosingBalance] = useState<{
    qty: number;
    amount: number;
  } | null>(null);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Location dropdown state
  const [locationOptions, setLocationOptions] = useState<
    { label: string; value: string; description?: string }[]
  >([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  // Item dropdown state
  const [itemOptions, setItemOptions] = useState<
    { label: string; value: string; description?: string }[]
  >([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [itemPage, setItemPage] = useState(1);
  const [hasMoreItems, setHasMoreItems] = useState(false);
  const [isLoadingMoreItems, setIsLoadingMoreItems] = useState(false);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>("Posting_Date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    typeof window !== "undefined"
      ? loadVisibleColumns()
      : getDefaultVisibleColumns(),
  );

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [totalCount, pageSize]);

  // Selected Item Label for Summary
  const selectedItemLabel = useMemo(() => {
    return itemOptions.find((opt) => opt.value === appliedFilters.itemNo);
  }, [itemOptions, appliedFilters.itemNo]);

  // Selected Location Label
  const selectedLocationLabel = useMemo(() => {
    return locationOptions.find(
      (opt) => opt.value === appliedFilters.locationCode,
    );
  }, [locationOptions, appliedFilters.locationCode]);

  // Date Range for Summary
  const dateRange = useMemo(() => {
    return {
      from: appliedFilters.postingDateFrom
        ? new Date(appliedFilters.postingDateFrom)
        : undefined,
      to: appliedFilters.postingDateTo
        ? new Date(appliedFilters.postingDateTo)
        : undefined,
    };
  }, [appliedFilters.postingDateFrom, appliedFilters.postingDateTo]);

  // ─── Load user's assigned location codes from WebUserSetup ───
  useEffect(() => {
    if (!userID) return;

    const loadLocations = async () => {
      setIsLoadingLocations(true);
      try {
        const locs = await getAllLOCsFromUserSetup(userID);
        setLocationOptions(
          locs.map((loc) => ({
            label: loc.Code,
            value: loc.Code,
          })),
        );
      } catch (error) {
        console.error("Error loading user locations:", error);
        toast.error("Failed to load location options");
        setLocationOptions([]);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    loadLocations();
  }, [userID]);

  // ─── Load items ───
  useEffect(() => {
    if (!filters.locationCode) {
      setItemOptions([]);
      setHasMoreItems(false);
      return;
    }

    const loadItems = async () => {
      const isLoadMore = itemPage > 1;

      if (isLoadMore) {
        setIsLoadingMoreItems(true);
      } else {
        setIsLoadingItems(true);
      }

      try {
        const skip = (itemPage - 1) * ITEM_PAGE_SIZE;
        const items = await getItems(
          itemSearchQuery || undefined,
          undefined,
          skip,
          ITEM_PAGE_SIZE,
        );

        setHasMoreItems(items.length === ITEM_PAGE_SIZE);

        const formattedOptions = items.map((item) => ({
          label: `${item.No} - ${item.Description}`,
          value: item.No,
          description: item.Description,
        }));

        if (isLoadMore) {
          setItemOptions((prev) => [...prev, ...formattedOptions]);
        } else {
          setItemOptions(formattedOptions);
        }
      } catch (error) {
        console.error("Error loading items:", error);
        if (!isLoadMore) {
          toast.error("Failed to load item options");
          setItemOptions([]);
        }
      } finally {
        setIsLoadingItems(false);
        setIsLoadingMoreItems(false);
      }
    };

    loadItems();
  }, [filters.locationCode, itemSearchQuery, itemPage]);

  // ─── FETCH METRICS (Enhanced: 8 metrics) ───
  useEffect(() => {
    // Only fetch metrics if item, location, and dates applied
    if (
      !appliedFilters.itemNo ||
      !appliedFilters.locationCode ||
      !appliedFilters.postingDateFrom ||
      !appliedFilters.postingDateTo
    ) {
      setCurrentStock(null);
      setOpeningBalance(null);
      setIncreaseMetrics(null);
      setDecreaseMetrics(null);
      setClosingBalance(null);
      return;
    }

    const fetchMetrics = async () => {
      setIsLoadingStock(true);
      setIsLoadingSummary(true);

      try {
        // 1. Fetch Current Stock
        const { entries: stockEntries } = await getItemWiseStock({
          $filter: `ItemNo eq '${appliedFilters.itemNo}' and LocationCode eq '${appliedFilters.locationCode}'`,
          $top: 1,
        });
        setCurrentStock(stockEntries[0] || null);

        // 2. Fetch all metrics in parallel
        const fromDate = new Date(appliedFilters.postingDateFrom);
        const toDate = new Date(appliedFilters.postingDateTo);

        const [opening, increase, decrease] = await Promise.all([
          getCalculatedOpeningBalance(
            appliedFilters.itemNo,
            appliedFilters.locationCode,
            fromDate,
          ),
          getIncreaseMetrics(
            appliedFilters.itemNo,
            appliedFilters.locationCode,
            fromDate,
            toDate,
          ),
          getDecreaseMetrics(
            appliedFilters.itemNo,
            appliedFilters.locationCode,
            fromDate,
            toDate,
          ),
        ]);

        setOpeningBalance(opening);
        setIncreaseMetrics(increase);
        setDecreaseMetrics(decrease);

        // 3. Calculate closing: Opening + Increase - Decrease
        const closing = {
          qty: opening.qty + increase.qty - decrease.qty,
          amount: opening.amount + increase.amount - decrease.amount,
        };
        setClosingBalance(closing);
      } catch (error) {
        console.error("Error fetching metrics:", error);
        toast.error("Failed to fetch inventory metrics");
        setCurrentStock(null);
        setOpeningBalance(null);
        setIncreaseMetrics(null);
        setDecreaseMetrics(null);
        setClosingBalance(null);
      } finally {
        setIsLoadingStock(false);
        setIsLoadingSummary(false);
      }
    };

    fetchMetrics();
  }, [appliedFilters]);

  // ─── Standard Ledger Logic ───

  const buildFilterString = useCallback((): string => {
    const filterParts: string[] = [];

    if (appliedFilters.itemNo) {
      filterParts.push(`Item_No eq '${appliedFilters.itemNo}'`);
    }

    if (appliedFilters.locationCode) {
      filterParts.push(`Location_Code eq '${appliedFilters.locationCode}'`);
    }

    if (appliedFilters.postingDateFrom) {
      filterParts.push(`Posting_Date ge ${appliedFilters.postingDateFrom}`);
    }

    if (appliedFilters.postingDateTo) {
      filterParts.push(`Posting_Date le ${appliedFilters.postingDateTo}`);
    }

    return filterParts.join(" and ");
  }, [appliedFilters]);

  const getOrderByString = useCallback((): string | undefined => {
    if (!sortColumn || !sortDirection) return undefined;
    return `${sortColumn} ${sortDirection}`;
  }, [sortColumn, sortDirection]);

  const fetchEntries = useCallback(async () => {
    if (
      !appliedFilters.locationCode ||
      !appliedFilters.itemNo ||
      !appliedFilters.postingDateFrom ||
      !appliedFilters.postingDateTo
    ) {
      setEntries([]);
      setTotalCount(0);
      return;
    }

    setIsLoading(true);
    try {
      const params = {
        $select: buildSelectQuery(visibleColumns),
        $filter: buildFilterString(),
        $orderby: getOrderByString(),
        $top: pageSize,
        $skip: (currentPage - 1) * pageSize,
        $count: true,
      };

      const result = await getItemLedgerEntries(params);
      setEntries(result.entries);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error("Error fetching item ledger entries:", error);
      toast.error("Failed to load item ledger entries. Please try again.");
      setEntries([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [
    appliedFilters,
    pageSize,
    currentPage,
    visibleColumns,
    buildFilterString,
    getOrderByString,
  ]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Handlers (Duplicated for brevity, same as before)
  const handleFiltersChange = useCallback(
    (newFilters: Partial<ReportLedgerFilters>) => {
      setFilters((prev) => {
        const next = { ...prev, ...newFilters };
        if (
          "locationCode" in newFilters &&
          newFilters.locationCode !== prev.locationCode
        ) {
          next.itemNo = "";
          setItemSearchQuery("");
          setItemPage(1);
          setItemOptions([]);
          setHasMoreItems(false);
        }
        return next;
      });
    },
    [],
  );

  const handleApplyFilters = useCallback(() => {
    if (
      !filters.locationCode ||
      !filters.itemNo ||
      !filters.postingDateFrom ||
      !filters.postingDateTo
    ) {
      toast.error("Please fill in all filter fields");
      return;
    }

    if (filters.postingDateFrom > filters.postingDateTo) {
      toast.error("'Date From' cannot be after 'Date To'");
      return;
    }

    setAppliedFilters(filters);
    setCurrentPage(1);
  }, [filters]);

  const handleClearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setEntries([]);
    setTotalCount(0);
    setCurrentPage(1);
    setItemSearchQuery("");
    setItemPage(1);
    setItemOptions([]);
    setHasMoreItems(false);
    setCurrentStock(null);
    setOpeningBalance(null);
    setIncreaseMetrics(null);
    setDecreaseMetrics(null);
    setClosingBalance(null);
  }, []);

  const handlePageSizeChange = useCallback((size: PageSize) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSort = useCallback((column: string) => {
    setSortColumn((prevColumn) => {
      if (prevColumn === column) {
        setSortDirection((prevDir) => {
          if (prevDir === "asc") return "desc";
          if (prevDir === "desc") return null;
          return "asc";
        });
        return column;
      }
      setSortDirection("asc");
      return column;
    });
  }, []);

  const handleColumnToggle = useCallback((columnId: string) => {
    setVisibleColumns((prev) => {
      const newColumns = prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId];
      saveVisibleColumns(newColumns);
      return newColumns;
    });
  }, []);

  const handleResetColumns = useCallback(() => {
    const defaultColumns = getDefaultVisibleColumns();
    setVisibleColumns(defaultColumns);
    saveVisibleColumns(defaultColumns);
  }, []);

  const handleShowAllColumns = useCallback(() => {
    const allColumnIds = ALL_COLUMNS.map((col) => col.id);
    setVisibleColumns(allColumnIds);
    saveVisibleColumns(allColumnIds);
  }, []);

  const handleItemSearch = useCallback((query: string) => {
    setItemSearchQuery(query);
    setItemPage(1);
  }, []);

  const handleLoadMoreItems = useCallback(() => {
    if (!hasMoreItems || isLoadingMoreItems) return;
    setItemPage((prev) => prev + 1);
  }, [hasMoreItems, isLoadingMoreItems]);

  const hasNextPage = currentPage < totalPages;

  return {
    entries,
    isLoading,
    pageSize,
    currentPage,
    totalPages,
    totalCount,
    hasNextPage,
    filters,
    appliedFilters,
    locationOptions,
    itemOptions,
    isLoadingLocations,
    isLoadingItems,
    isLoadingMoreItems,
    hasMoreItems,
    onPageSizeChange: handlePageSizeChange,
    onPageChange: handlePageChange,
    onSort: handleSort,
    onFiltersChange: handleFiltersChange,
    onApplyFilters: handleApplyFilters,
    onClearFilters: handleClearFilters,
    onItemSearch: handleItemSearch,
    onLoadMoreItems: handleLoadMoreItems,
    visibleColumns,
    onColumnToggle: handleColumnToggle,
    onResetColumns: handleResetColumns,
    onShowAllColumns: handleShowAllColumns,
    refetch: fetchEntries,
    sortColumn,
    sortDirection,
    // Metrics
    currentStock,
    openingBalance,
    increaseMetrics,
    decreaseMetrics,
    closingBalance,
    isLoadingStock,
    isLoadingSummary,
    selectedItem: selectedItemLabel,
    selectedLocation: selectedLocationLabel,
    dateRange,
  };
}
