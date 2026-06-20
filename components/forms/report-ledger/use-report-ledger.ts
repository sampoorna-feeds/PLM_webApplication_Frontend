"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  getItemLedgerEntries,
  ItemLedgerEntry,
} from "@/lib/api/services/report-ledger.service";

import { getAllBranchesFromUserSetup } from "@/lib/api/services/dimension.service";
import { getLocationsByBranches } from "@/lib/api/services/location.service";
import { getItems } from "@/lib/api/services/production-order-data.service";
import {
  type PageSize,
  type ReportLedgerFilters,
  type FilterCondition,
  EMPTY_FILTERS,
} from "./types";
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
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const isLoadingRef = useRef(false);
  const isFetchingNextPageRef = useRef(false);
  const lastRequestId = useRef(0);
  const entriesLengthRef = useRef(0);

  const LIMIT = 200;

  // Filters state
  const [filters, setFilters] = useState<ReportLedgerFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<ReportLedgerFilters>(EMPTY_FILTERS);
  const [columnFilters, setColumnFilters] = useState<
    Record<string, { value: string; valueTo?: string }>
  >({});

  // All available location codes (for "select all" logic)
  const [allLocationCodes, setAllLocationCodes] = useState<string[]>([]);

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

  const hasMore = useMemo(
    () => entries.length < totalCount,
    [entries.length, totalCount]
  );

  // ─── Load user's assigned location codes from LocationList filtered by WebUserSetup branches ───
  useEffect(() => {
    if (!userID) return;

    const loadLocations = async () => {
      setIsLoadingLocations(true);
      try {
        const branches = await getAllBranchesFromUserSetup(userID);
        const branchCodes = branches.map((b) => b.Code).filter(Boolean);
        const locations = await getLocationsByBranches(branchCodes);

        const options = locations.map((loc) => ({
          label: `${loc.Code} - ${loc.Name || ""}`,
          value: loc.Code,
        }));
        setLocationOptions(options);

        // Keep all locations deselected by default
        const allCodes = options.map((opt) => opt.value);
        setAllLocationCodes(allCodes);
        setFilters((prev) => ({ ...prev, locationCodes: [] }));
      } catch (error) {
        console.error("Error loading user locations:", error);
        toastError(error, "Failed to load location options");
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
          toastError(error, "Failed to load item options");
          setItemOptions([]);
        }
      } finally {
        setIsLoadingItems(false);
        setIsLoadingMoreItems(false);
      }
    };

    loadItems();
  }, [filters.locationCodes, itemSearchQuery, itemPage]);

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

    // Dynamic additional filters
    if (
      appliedFilters.additionalFilters &&
      appliedFilters.additionalFilters.length > 0
    ) {
      appliedFilters.additionalFilters.forEach((filter) => {
        if (!filter.value && filter.type !== "boolean") return; // Allow empty string for boolean if 'all' or handled

        const isString =
          filter.type === "text" ||
          filter.type === "enum" ||
          filter.type === "date";
        const formattedValue = isString ? `'${filter.value}'` : filter.value;

        switch (filter.operator) {
          case "eq": {
            const colConfig = ALL_COLUMNS.find((c) => c.id === filter.field);
            const hasOptions = colConfig?.filterOptions && colConfig.filterOptions.length > 0;
            if (filter.type === "text" && !hasOptions) {
              filterParts.push(`contains(${filter.field}, '${filter.value}')`);
            } else {
              filterParts.push(`${filter.field} eq ${formattedValue}`);
            }
            break;
          }
          case "ne":
          case "gt":
          case "ge":
          case "lt":
          case "le":
            filterParts.push(
              `${filter.field} ${filter.operator} ${formattedValue}`,
            );
            break;
          case "startswith":
            filterParts.push(`startswith(${filter.field}, '${filter.value}')`);
            break;
          case "endswith":
            filterParts.push(`endswith(${filter.field}, '${filter.value}')`);
            break;
        }
      });
    }

    // Column filters
    Object.entries(columnFilters).forEach(([col, filter]) => {
      const column = ALL_COLUMNS.find((c) => c.id === col);
      if (!column) return;

      if (column.filterType === "date") {
        if (filter.value) {
          filterParts.push(`${col} ge ${filter.value}`);
        }
        if (filter.valueTo) {
          filterParts.push(`${col} le ${filter.valueTo}`);
        }
      } else if (column.filterType === "number") {
        if (filter.valueTo) {
          if (filter.value) filterParts.push(`${col} ge ${filter.value}`);
          filterParts.push(`${col} le ${filter.valueTo}`);
        } else if (filter.value) {
          const [operator, numValue] = filter.value.includes(":")
            ? filter.value.split(":")
            : ["eq", filter.value];
          switch (operator) {
            case "gt":
              filterParts.push(`${col} gt ${numValue}`);
              break;
            case "lt":
              filterParts.push(`${col} lt ${numValue}`);
              break;
            case "ge":
              filterParts.push(`${col} ge ${numValue}`);
              break;
            case "le":
              filterParts.push(`${col} le ${numValue}`);
              break;
            default:
              filterParts.push(`${col} eq ${numValue}`);
          }
        }
      } else if (column.filterType === "boolean") {
        if (filter.value === "true") {
          filterParts.push(`${col} eq true`);
        } else if (filter.value === "false") {
          filterParts.push(`${col} eq false`);
        }
      } else {
        // String/text/enum filter
        if (filter.value !== undefined && filter.value !== null) {
          const escaped = filter.value.replace(/'/g, "''");
          if (escaped.includes(",")) {
            const vals = escaped
              .split(",")
              .map((v) => (v === " " ? " " : v.trim()))
              .filter((v) => v !== "");
            if (vals.length > 0) {
              const orParts = vals.map((v) => {
                if (column.filterOptions && column.filterOptions.length > 0) {
                  return `${col} eq '${v}'`;
                } else {
                  return `contains(${col},'${v}')`;
                }
              });
              filterParts.push(`(${orParts.join(" or ")})`);
            }
          } else {
            const val = escaped === " " ? " " : escaped.trim();
            if (val !== "") {
              if (column.filterOptions && column.filterOptions.length > 0) {
                filterParts.push(`${col} eq '${val}'`);
              } else {
                filterParts.push(`contains(${col},'${val}')`);
              }
            }
          }
        }
      }
    });

    return filterParts.join(" and ");
  }, [appliedFilters, columnFilters]);

  const buildHumanReadableFilters = useCallback((): string[] => {
    const lines: string[] = [];

    if (appliedFilters.locationCodes.length > 0) {
      lines.push(`Locations: ${appliedFilters.locationCodes.join(", ")}`);
    }

    if (appliedFilters.itemNo) {
      lines.push(`Item No: ${appliedFilters.itemNo}`);
    }

    if (appliedFilters.postingDateFrom && appliedFilters.postingDateTo) {
      lines.push(
        `Date Range: ${appliedFilters.postingDateFrom} to ${appliedFilters.postingDateTo}`,
      );
    } else if (appliedFilters.postingDateFrom) {
      lines.push(`Date From: ${appliedFilters.postingDateFrom}`);
    } else if (appliedFilters.postingDateTo) {
      lines.push(`Date To: ${appliedFilters.postingDateTo}`);
    }

    if (
      appliedFilters.additionalFilters &&
      appliedFilters.additionalFilters.length > 0
    ) {
      appliedFilters.additionalFilters.forEach((filter) => {
        lines.push(`${filter.field} ${filter.operator} ${filter.value}`);
      });
    }

    return lines;
  }, [appliedFilters]);

  const getOrderByString = useCallback((): string | undefined => {
    if (!sortColumn || !sortDirection) return undefined;
    return `${sortColumn} ${sortDirection}`;
  }, [sortColumn, sortDirection]);

  const fetchEntries = useCallback(async (isAppending = false) => {
    // Only location is required; item and dates are optional
    if (appliedFilters.locationCodes.length === 0) {
      setEntries([]);
      setTotalCount(0);
      setIsLoading(false);
      setIsFetchingNextPage(false);
      return;
    }

    const requestId = ++lastRequestId.current;

    if (isAppending) {
      isFetchingNextPageRef.current = true;
      setIsFetchingNextPage(true);
    } else {
      isLoadingRef.current = true;
      setIsLoading(true);
    }

    try {
      const skip = isAppending ? entriesLengthRef.current : 0;
      const params = {
        $select: buildSelectQuery(visibleColumns),
        $filter: buildFilterString(),
        $orderby: getOrderByString(),
        $top: LIMIT,
        $skip: skip,
        $count: true,
      };

      const result = await getItemLedgerEntries(params);

      if (requestId !== lastRequestId.current) return;

      if (isAppending) {
        setEntries(prev => {
          const newEntries = [...prev, ...result.entries];
          entriesLengthRef.current = newEntries.length;
          return newEntries;
        });
      } else {
        setEntries(result.entries);
        entriesLengthRef.current = result.entries.length;
      }
      setTotalCount(result.totalCount);
    } catch (error) {
      if (requestId !== lastRequestId.current) return;
      console.error("Error fetching item ledger entries:", error);
      toastError(error, "Failed to load item ledger entries. Please try again.");
      if (!isAppending) {
        setEntries([]);
        setTotalCount(0);
      }
    } finally {
      if (requestId === lastRequestId.current) {
        setIsLoading(false);
        setIsFetchingNextPage(false);
        isLoadingRef.current = false;
        isFetchingNextPageRef.current = false;
      }
    }
  }, [
    appliedFilters,
    visibleColumns,
    buildFilterString,
    getOrderByString,
  ]);

  useEffect(() => {
    fetchEntries(false);
  }, [fetchEntries]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingRef.current || isFetchingNextPageRef.current) return;
    fetchEntries(true);
  }, [hasMore, fetchEntries]);

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

  const handleApplyAdditionalFilters = useCallback(
    (additionalFilters: FilterCondition[]) => {
      setFilters((prev) => {
        const next = { ...prev, additionalFilters };
        if (next.locationCodes.length > 0) {
          // If dates are provided, ensure they are valid in relation to each other
          if (
            next.postingDateFrom &&
            next.postingDateTo &&
            next.postingDateFrom > next.postingDateTo
          ) {
            // We just skip applying to state if dates are invalid
          } else {
            setAppliedFilters(next);
          }
        }
        return next;
      });
    },
    [],
  );

  const handleApplyFilters = useCallback(() => {
    if (filters.locationCodes.length === 0) {
      toastError(new Error("Please select at least one location"));
      return;
    }

    if (
      filters.postingDateFrom &&
      filters.postingDateTo &&
      filters.postingDateFrom > filters.postingDateTo
    ) {
      toastError(new Error("'Date From' cannot be after 'Date To'"));
      return;
    }

    setAppliedFilters(filters);
  }, [filters]);

  const handleClearFilters = useCallback(() => {
    // Reset to no locations selected
    const resetFilters = {
      ...EMPTY_FILTERS,
      locationCodes: [],
    };
    setFilters(resetFilters);
    setAppliedFilters(EMPTY_FILTERS);
    setColumnFilters({});
    setEntries([]);
    setTotalCount(0);
    setItemSearchQuery("");
    setItemPage(1);
    setItemOptions([]);
    setHasMoreItems(false);
  }, []);

  const handleColumnFilter = useCallback(
    (columnId: string, value: string, valueTo?: string) => {
      setColumnFilters((prev) => {
        const next = { ...prev };
        if (!value && !valueTo) {
          delete next[columnId];
        } else {
          next[columnId] = { value, valueTo };
        }
        return next;
      });
    },
    [],
  );

  const handleClearColumnFilters = useCallback(() => {
    setColumnFilters({});
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

  return {
    entries,
    isLoading,
    isFetchingNextPage,
    hasMore,
    loadMore,
    totalCount,
    currentFilterString: buildFilterString(),
    humanReadableFilters: buildHumanReadableFilters(),
    filters,
    appliedFilters,
    locationOptions,
    itemOptions,
    isLoadingLocations,
    isLoadingItems,
    isLoadingMoreItems,
    hasMoreItems,
    onSort: handleSort,
    // Actions
    handleFiltersChange,
    handleApplyFilters,
    handleApplyAdditionalFilters,
    handleClearFilters,
    onClearFilters: handleClearFilters,
    onItemSearch: handleItemSearch,
    onLoadMoreItems: handleLoadMoreItems,
    visibleColumns,
    onColumnToggle: handleColumnToggle,
    onResetColumns: handleResetColumns,
    onShowAllColumns: handleShowAllColumns,
    refetch: () => fetchEntries(false),
    sortColumn,
    sortDirection,
    columnFilters,
    onColumnFilter: handleColumnFilter,
    onClearColumnFilters: handleClearColumnFilters,
  };
}
