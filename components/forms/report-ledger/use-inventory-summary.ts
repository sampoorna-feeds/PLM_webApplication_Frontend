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
import { getItems } from "@/lib/api/services/production-order-data.service";
import type { Item } from "@/lib/api/services/item.service";
import { exportSummaryToExcel } from "@/lib/utils/export";
import type { FilterCondition } from "./types";

const ITEM_PAGE_SIZE = 50;

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
  itemNo: string;
  additionalFilters?: FilterCondition[];
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
  itemNo: "",
  additionalFilters: [],
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

  // Item dropdown state
  const [itemOptions, setItemOptions] = useState<
    { label: string; value: string; description?: string }[]
  >([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [itemPage, setItemPage] = useState(1);
  const [hasMoreItems, setHasMoreItems] = useState(false);
  const [isLoadingMoreItems, setIsLoadingMoreItems] = useState(false);

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
          itemNo: appliedFilters.itemNo || undefined,
        }),
        getIncreasesPerItem({
          locationCodes: appliedFilters.locationCodes,
          fromDate,
          toDate,
          itemNo: appliedFilters.itemNo || undefined,
        }),
        getDecreasesPerItem({
          locationCodes: appliedFilters.locationCodes,
          fromDate,
          toDate,
          itemNo: appliedFilters.itemNo || undefined,
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

  // Flat paginated view (pagination operates on rows, not groups)
  const paginatedRows = useMemo(() => {
    let filteredRows = allRows;
    if (
      appliedFilters.additionalFilters &&
      appliedFilters.additionalFilters.length > 0
    ) {
      filteredRows = allRows.filter((row) => {
        return appliedFilters.additionalFilters!.every((cond) => {
          // Map condition onto row properties based on id or label
          // E.g. Item_No -> itemNo, Quantity -> closingQty, basically we might need a mapping since SummaryRow doesn't have exact column names.

          let val: any = undefined;

          switch (cond.field) {
            case "Item_No":
              val = row.itemNo;
              break;
            case "Description":
              val = row.description;
              break;
            case "Unit_of_Measure_Code":
              val = row.baseUoM;
              break;
            // The row doesn't have all columns from ALL_COLUMNS, some of them are summary fields.
            // Let's fallback or parse depending on what we have.
            default:
              // For summary row, we mainly have: itemNo, description, baseUoM, inventoryPostingGroup
              break;
          }

          // If the field isn't mapped, we can't really filter it efficiently here (e.g. dimensions that aren't fetched).
          // But Item_No, Description, inventoryPostingGroup are here.
          if (val === undefined) return true; // skip condition if field not found

          const conditionVal = String(cond.value).toLowerCase();
          const rowValStr = String(val).toLowerCase();

          switch (cond.operator) {
            case "eq":
              return rowValStr === conditionVal;
            case "ne":
              return rowValStr !== conditionVal;
            case "contains":
              return rowValStr.includes(conditionVal);
            case "startswith":
              return rowValStr.startsWith(conditionVal);
            case "endswith":
              return rowValStr.endsWith(conditionVal);
            case "gt":
              return Number(val) > Number(cond.value);
            case "ge":
              return Number(val) >= Number(cond.value);
            case "lt":
              return Number(val) < Number(cond.value);
            case "le":
              return Number(val) <= Number(cond.value);
            default:
              return true;
          }
        });
      });
    }

    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [allRows, currentPage, appliedFilters.additionalFilters]);

  // Updating grouped items calculation as well
  const grouped = useMemo<SummaryGroup[]>(() => {
    let filteredRows = allRows;
    if (
      appliedFilters.additionalFilters &&
      appliedFilters.additionalFilters.length > 0
    ) {
      filteredRows = allRows.filter((row) => {
        return appliedFilters.additionalFilters!.every((cond) => {
          let val: any = undefined;
          switch (cond.field) {
            case "Item_No":
              val = row.itemNo;
              break;
            case "Description":
              val = row.description;
              break;
            case "Unit_of_Measure_Code":
              val = row.baseUoM;
              break;
          }
          if (val === undefined) return true;

          const conditionVal = String(cond.value).toLowerCase();
          const rowValStr = String(val).toLowerCase();

          switch (cond.operator) {
            case "eq":
              return rowValStr === conditionVal;
            case "ne":
              return rowValStr !== conditionVal;
            case "contains":
              return rowValStr.includes(conditionVal);
            case "startswith":
              return rowValStr.startsWith(conditionVal);
            case "endswith":
              return rowValStr.endsWith(conditionVal);
            case "gt":
              return Number(val) > Number(cond.value);
            case "ge":
              return Number(val) >= Number(cond.value);
            case "lt":
              return Number(val) < Number(cond.value);
            case "le":
              return Number(val) <= Number(cond.value);
            default:
              return true;
          }
        });
      });
    }

    if (filteredRows.length === 0) return [];

    const groupMap = new Map<string, SummaryRow[]>();
    for (const row of filteredRows) {
      const group = row.inventoryPostingGroup;
      if (!groupMap.has(group)) {
        groupMap.set(group, []);
      }
      groupMap.get(group)!.push(row);
    }

    return Array.from(groupMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([groupName, rows]) => ({ groupName, rows }));
  }, [allRows, appliedFilters.additionalFilters]);

  const totalPages = useMemo(() => {
    let filteredRows = allRows;
    if (
      appliedFilters.additionalFilters &&
      appliedFilters.additionalFilters.length > 0
    ) {
      filteredRows = allRows.filter((row) => {
        return appliedFilters.additionalFilters!.every((cond) => {
          let val: any = undefined;
          switch (cond.field) {
            case "Item_No":
              val = row.itemNo;
              break;
            case "Description":
              val = row.description;
              break;
            case "Unit_of_Measure_Code":
              val = row.baseUoM;
              break;
          }
          if (val === undefined) return true;

          const conditionVal = String(cond.value).toLowerCase();
          const rowValStr = String(val).toLowerCase();

          switch (cond.operator) {
            case "eq":
              return rowValStr === conditionVal;
            case "ne":
              return rowValStr !== conditionVal;
            case "contains":
              return rowValStr.includes(conditionVal);
            case "startswith":
              return rowValStr.startsWith(conditionVal);
            case "endswith":
              return rowValStr.endsWith(conditionVal);
            case "gt":
              return Number(val) > Number(cond.value);
            case "ge":
              return Number(val) >= Number(cond.value);
            case "lt":
              return Number(val) < Number(cond.value);
            case "le":
              return Number(val) <= Number(cond.value);
            default:
              return true;
          }
        });
      });
    }
    return Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  }, [allRows, appliedFilters.additionalFilters]);

  // ─── Actions ───

  const handleFiltersChange = useCallback(
    (newFilters: Partial<SummaryFilters>) => {
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
    setItemSearchQuery("");
    setItemPage(1);
    setItemOptions([]);
    setHasMoreItems(false);
  }, [allLocationCodes]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleItemSearch = useCallback((query: string) => {
    setItemSearchQuery(query);
    setItemPage(1);
  }, []);

  const handleLoadMoreItems = useCallback(() => {
    if (!hasMoreItems || isLoadingMoreItems) return;
    setItemPage((prev) => prev + 1);
  }, [hasMoreItems, isLoadingMoreItems]);

  const handleExport = useCallback(() => {
    if (allRows.length === 0) {
      toast.error("No summary data to export.");
      return;
    }

    const humanReadableFilters: string[] = [];
    if (appliedFilters.locationCodes.length > 0) {
      humanReadableFilters.push(
        `Locations: ${appliedFilters.locationCodes.join(", ")}`,
      );
    }
    if (appliedFilters.itemNo) {
      humanReadableFilters.push(`Item No: ${appliedFilters.itemNo}`);
    }
    if (appliedFilters.postingDateFrom && appliedFilters.postingDateTo) {
      humanReadableFilters.push(
        `Date Range: ${appliedFilters.postingDateFrom} to ${appliedFilters.postingDateTo}`,
      );
    }
    if (
      appliedFilters.additionalFilters &&
      appliedFilters.additionalFilters.length > 0
    ) {
      appliedFilters.additionalFilters.forEach((filter) => {
        humanReadableFilters.push(
          `${filter.field} ${filter.operator} ${filter.value}`,
        );
      });
    }

    exportSummaryToExcel(
      allRows,
      humanReadableFilters,
      appliedFilters.postingDateFrom,
      appliedFilters.postingDateTo,
    );
    toast.success(`Successfully exported ${allRows.length} summary rows.`);
  }, [allRows, appliedFilters]);

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
    itemOptions,
    isLoadingLocations,
    isLoadingItems,
    isLoadingMoreItems,
    hasMoreItems,
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
    onItemSearch: handleItemSearch,
    onLoadMoreItems: handleLoadMoreItems,
    handleExport,
    refetch: fetchSummaryData,
  };
}
