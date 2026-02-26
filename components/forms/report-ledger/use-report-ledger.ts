"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  getItemLedgerEntries,
  ItemLedgerEntry,
} from "@/lib/api/services/report-ledger.service";
import {
  getOpeningBalance,
  getClosingBalance,
  getIncomingMetrics,
  getOutgoingMetrics,
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

  // All available location codes (for "select all" logic)
  const [allLocationCodes, setAllLocationCodes] = useState<string[]>([]);

  // Metrics State (Enhanced: qty + amount for each)
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

  // Selected Location Labels
  const selectedLocationLabels = useMemo(() => {
    return locationOptions.filter((opt) =>
      appliedFilters.locationCodes.includes(opt.value),
    );
  }, [locationOptions, appliedFilters.locationCodes]);

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
        const options = locs.map((loc) => ({
          label: loc.Code,
          value: loc.Code,
        }));
        setLocationOptions(options);

        // Auto-select all locations by default
        const allCodes = options.map((opt) => opt.value);
        setAllLocationCodes(allCodes);
        setFilters((prev) => ({ ...prev, locationCodes: allCodes }));
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
    if (filters.locationCodes.length === 0) {
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
  }, [filters.locationCodes, itemSearchQuery, itemPage]);

  // ─── FETCH METRICS (when locations + dates are applied) ───
  useEffect(() => {
    // Metrics require locations + dates; item is optional
    if (
      appliedFilters.locationCodes.length === 0 ||
      !appliedFilters.postingDateFrom ||
      !appliedFilters.postingDateTo
    ) {
      setOpeningBalance(null);
      setIncreaseMetrics(null);
      setDecreaseMetrics(null);
      setClosingBalance(null);
      return;
    }

    const fetchMetrics = async () => {
      setIsLoadingSummary(true);

      try {
        const fromDate = new Date(appliedFilters.postingDateFrom);
        const toDate = new Date(appliedFilters.postingDateTo);
        const itemNo = appliedFilters.itemNo || undefined;

        const [opening, closing, incoming, outgoing] = await Promise.all([
          getOpeningBalance(appliedFilters.locationCodes, fromDate, itemNo),
          getClosingBalance(appliedFilters.locationCodes, toDate, itemNo),
          getIncomingMetrics(
            appliedFilters.locationCodes,
            fromDate,
            toDate,
            itemNo,
          ),
          getOutgoingMetrics(
            appliedFilters.locationCodes,
            fromDate,
            toDate,
            itemNo,
          ),
        ]);

        setOpeningBalance(opening);
        setClosingBalance(closing);
        setIncreaseMetrics(incoming);
        setDecreaseMetrics(outgoing);
      } catch (error) {
        console.error("Error fetching metrics:", error);
        toast.error("Failed to fetch inventory metrics");
        setOpeningBalance(null);
        setIncreaseMetrics(null);
        setDecreaseMetrics(null);
        setClosingBalance(null);
      } finally {
        setIsLoadingSummary(false);
      }
    };

    fetchMetrics();
  }, [appliedFilters]);

  // ─── Standard Ledger Logic ───

  const buildFilterString = useCallback((): string => {
    const filterParts: string[] = [];

    // Multi-location OR filter
    if (appliedFilters.locationCodes.length > 0) {
      if (appliedFilters.locationCodes.length === 1) {
        filterParts.push(
          `Location_Code eq '${appliedFilters.locationCodes[0]}'`,
        );
      } else {
        const locationOr = appliedFilters.locationCodes
          .map((code) => `Location_Code eq '${code}'`)
          .join(" or ");
        filterParts.push(`(${locationOr})`);
      }
    }

    if (appliedFilters.itemNo) {
      filterParts.push(`Item_No eq '${appliedFilters.itemNo}'`);
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
    // Only locations + dates are required; item is optional
    if (
      appliedFilters.locationCodes.length === 0 ||
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

  // Handlers
  const handleFiltersChange = useCallback(
    (newFilters: Partial<ReportLedgerFilters>) => {
      setFilters((prev) => {
        const next = { ...prev, ...newFilters };
        // If locations changed, reset item selection
        if (
          "locationCodes" in newFilters &&
          JSON.stringify(newFilters.locationCodes) !==
            JSON.stringify(prev.locationCodes)
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
    // Only locations + dates are required
    if (
      filters.locationCodes.length === 0 ||
      !filters.postingDateFrom ||
      !filters.postingDateTo
    ) {
      toast.error(
        "Please select at least one location and fill in date fields",
      );
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
    // Reset to all locations selected
    const resetFilters = {
      ...EMPTY_FILTERS,
      locationCodes: allLocationCodes,
    };
    setFilters(resetFilters);
    setAppliedFilters(EMPTY_FILTERS);
    setEntries([]);
    setTotalCount(0);
    setCurrentPage(1);
    setItemSearchQuery("");
    setItemPage(1);
    setItemOptions([]);
    setHasMoreItems(false);
    setOpeningBalance(null);
    setIncreaseMetrics(null);
    setDecreaseMetrics(null);
    setClosingBalance(null);
  }, [allLocationCodes]);

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
    openingBalance,
    increaseMetrics,
    decreaseMetrics,
    closingBalance,
    isLoadingSummary,
    selectedItem: selectedItemLabel,
    selectedLocations: selectedLocationLabels,
    dateRange,
  };
}
