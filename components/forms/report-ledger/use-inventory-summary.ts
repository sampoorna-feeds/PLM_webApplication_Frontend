"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/contexts/auth-context";
import { getAllLOCsFromUserSetup } from "@/lib/api/services/dimension.service";
import {
  getOpeningBalancePerItem,
  getIncreasesPerItem,
  getDecreasesPerItem,
  type ItemMetrics,
} from "@/lib/api/services/inventory.service";
import { getItemDetailsForSummary } from "@/lib/api/services/item.service";
import type { Item } from "@/lib/api/services/item.service";

// ─── Types ───

export interface SummaryRow {
  itemNo: string;
  description: string;
  baseUoM: string;
  inventoryPostingGroup: string;
  openingQty: number;
  openingValue: number;
  increasesQty: number;
  increasesValue: number;
  decreasesQty: number;
  decreasesValue: number;
  closingQty: number;
  closingValue: number;
  costPostedToGL: string; // "-" placeholder for now
}

export interface SummaryGroup {
  groupName: string;
  rows: SummaryRow[];
}

export interface SummaryFilters {
  locationCodes: string[];
  postingDateFrom: string;
  postingDateTo: string;
}

type LoadingPhase =
  | "idle"
  | "fetching-stock"
  | "enriching-items"
  | "done"
  | "error";

const EMPTY_SUMMARY_FILTERS: SummaryFilters = {
  locationCodes: [],
  postingDateFrom: "",
  postingDateTo: "",
};

const PAGE_SIZE = 50;

// ─── Hook ───

export function useInventorySummary() {
  const { userID } = useAuth();

  // Filters
  const [filters, setFilters] = useState<SummaryFilters>(EMPTY_SUMMARY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<SummaryFilters>(
    EMPTY_SUMMARY_FILTERS,
  );

  // Location dropdown state
  const [locationOptions, setLocationOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [allLocationCodes, setAllLocationCodes] = useState<string[]>([]);

  // Data
  const [allRows, setAllRows] = useState<SummaryRow[]>([]);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("idle");
  const [currentPage, setCurrentPage] = useState(1);

  // ─── Load locations ───

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

        const allCodes = options.map((opt) => opt.value);
        setAllLocationCodes(allCodes);
        setFilters((prev) => ({ ...prev, locationCodes: allCodes }));
      } catch (error) {
        console.error("Error loading locations:", error);
        toast.error("Failed to load location options");
      } finally {
        setIsLoadingLocations(false);
      }
    };

    loadLocations();
  }, [userID]);

  // ─── Fetch summary data ───

  const fetchSummaryData = useCallback(async () => {
    if (
      appliedFilters.locationCodes.length === 0 ||
      !appliedFilters.postingDateFrom ||
      !appliedFilters.postingDateTo
    ) {
      setAllRows([]);
      return;
    }

    const fromDate = new Date(appliedFilters.postingDateFrom);
    const toDate = new Date(appliedFilters.postingDateTo);

    setLoadingPhase("fetching-stock");
    setAllRows([]);
    setCurrentPage(1);

    try {
      // Step 1: Fetch 3 data streams in parallel (closing is computed)
      const [openingMap, increasesMap, decreasesMap] = await Promise.all([
        getOpeningBalancePerItem({
          locationCodes: appliedFilters.locationCodes,
          fromDate,
        }),
        getIncreasesPerItem({
          locationCodes: appliedFilters.locationCodes,
          fromDate,
          toDate,
        }),
        getDecreasesPerItem({
          locationCodes: appliedFilters.locationCodes,
          fromDate,
          toDate,
        }),
      ]);

      // Step 2: Collect all unique item numbers
      const allItemNos = new Set<string>();
      for (const map of [openingMap, increasesMap, decreasesMap]) {
        for (const key of map.keys()) {
          allItemNos.add(key);
        }
      }

      if (allItemNos.size === 0) {
        setAllRows([]);
        setLoadingPhase("done");
        return;
      }

      // Step 3: Fetch item details from ItemCard
      setLoadingPhase("enriching-items");
      const itemDetailsMap = await getItemDetailsForSummary(
        Array.from(allItemNos),
      );

      // Step 4: Merge into rows — compute closing as Opening + Increases - Decreases
      const rows: SummaryRow[] = [];

      for (const itemNo of allItemNos) {
        const itemDetail = itemDetailsMap.get(itemNo);
        const opening = openingMap.get(itemNo) || { qty: 0, amount: 0 };
        const increases = increasesMap.get(itemNo) || { qty: 0, amount: 0 };
        const decreases = decreasesMap.get(itemNo) || { qty: 0, amount: 0 };

        rows.push({
          itemNo,
          description: itemDetail?.Description || "",
          baseUoM: itemDetail?.Base_Unit_of_Measure || "",
          inventoryPostingGroup:
            itemDetail?.Inventory_Posting_Group || "UNKNOWN",
          openingQty: opening.qty,
          openingValue: opening.amount,
          increasesQty: increases.qty,
          increasesValue: increases.amount,
          decreasesQty: decreases.qty,
          decreasesValue: decreases.amount,
          closingQty: opening.qty + increases.qty - decreases.qty,
          closingValue: opening.amount + increases.amount - decreases.amount,
          costPostedToGL: "-",
        });
      }

      // Sort by posting group, then item no
      rows.sort((a, b) => {
        const groupCmp = a.inventoryPostingGroup.localeCompare(
          b.inventoryPostingGroup,
        );
        if (groupCmp !== 0) return groupCmp;
        return a.itemNo.localeCompare(b.itemNo);
      });

      setAllRows(rows);
      setLoadingPhase("done");
    } catch (error) {
      console.error("Error fetching summary data:", error);
      toast.error("Failed to load inventory summary. Please try again.");
      setAllRows([]);
      setLoadingPhase("error");
    }
  }, [appliedFilters]);

  useEffect(() => {
    if (
      appliedFilters.locationCodes.length > 0 &&
      appliedFilters.postingDateFrom &&
      appliedFilters.postingDateTo
    ) {
      fetchSummaryData();
    }
  }, [fetchSummaryData]);

  // ─── Grouped data with pagination ───

  const grouped = useMemo<SummaryGroup[]>(() => {
    if (allRows.length === 0) return [];

    const groupMap = new Map<string, SummaryRow[]>();
    for (const row of allRows) {
      const group = row.inventoryPostingGroup;
      if (!groupMap.has(group)) {
        groupMap.set(group, []);
      }
      groupMap.get(group)!.push(row);
    }

    return Array.from(groupMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([groupName, rows]) => ({ groupName, rows }));
  }, [allRows]);

  // Flat paginated view (pagination operates on rows, not groups)
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return allRows.slice(start, start + PAGE_SIZE);
  }, [allRows, currentPage]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(allRows.length / PAGE_SIZE)),
    [allRows],
  );

  // ─── Actions ───

  const handleFiltersChange = useCallback(
    (newFilters: Partial<SummaryFilters>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
    },
    [],
  );

  const handleApplyFilters = useCallback(() => {
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
    const resetFilters = {
      ...EMPTY_SUMMARY_FILTERS,
      locationCodes: allLocationCodes,
    };
    setFilters(resetFilters);
    setAppliedFilters(EMPTY_SUMMARY_FILTERS);
    setAllRows([]);
    setCurrentPage(1);
    setLoadingPhase("idle");
  }, [allLocationCodes]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const isLoading =
    loadingPhase === "fetching-stock" || loadingPhase === "enriching-items";

  const loadingMessage =
    loadingPhase === "fetching-stock"
      ? "Fetching stock data..."
      : loadingPhase === "enriching-items"
        ? "Enriching item details..."
        : "";

  return {
    // Filter state
    filters,
    appliedFilters,
    locationOptions,
    isLoadingLocations,
    // Data
    allRows,
    grouped,
    paginatedRows,
    isLoading,
    loadingPhase,
    loadingMessage,
    // Pagination
    currentPage,
    totalPages,
    totalCount: allRows.length,
    // Actions
    handleFiltersChange,
    handleApplyFilters,
    handleClearFilters,
    handlePageChange,
    refetch: fetchSummaryData,
  };
}
