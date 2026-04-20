"use client";

import { useState, useEffect, useMemo } from "react";
import { getItemsAvailableStock } from "@/lib/api/services/production-order-data.service";
import type { ProductionOrderComponent } from "@/lib/api/services/production-orders.service";

/**
 * Hook to fetch available stock (Net_Change) for production order components.
 * Groups components by location and batches API calls per location.
 * Returns a map keyed by `${Item_No}-${Location_Code}` -> Net_Change (or null if not found).
 */
export function useAvailableStock(components: ProductionOrderComponent[]) {
  const [stockMap, setStockMap] = useState<Record<string, number | null>>({});
  const [isLoading, setIsLoading] = useState(false);

  const componentsKey = useMemo(() => {
    const pairs = components
      .filter((c) => c.Item_No && c.Location_Code)
      .map((c) => `${c.Item_No.trim()}|${c.Location_Code}`)
      .sort();
    return [...new Set(pairs)].join(",");
  }, [components]);

  useEffect(() => {
    if (!componentsKey) {
      setStockMap({});
      return;
    }

    const fetchStock = async () => {
      setIsLoading(true);
      try {
        const byLocation: Record<string, Set<string>> = {};
        components.forEach((comp) => {
          if (!comp.Item_No || !comp.Location_Code) return;
          if (!byLocation[comp.Location_Code])
            byLocation[comp.Location_Code] = new Set();
          byLocation[comp.Location_Code].add(comp.Item_No.trim());
        });

        const today = new Date().toISOString().split("T")[0];
        const map: Record<string, number | null> = {};

        await Promise.all(
          Object.entries(byLocation).map(async ([locationCode, itemNosSet]) => {
            const itemNos = [...itemNosSet];
            const results = await getItemsAvailableStock(
              itemNos,
              locationCode,
              today,
            );
            results.forEach((item) => {
              map[`${item.No.trim()}-${locationCode}`] = item.Net_Change;
            });
          }),
        );

        setStockMap(map);
      } catch (error) {
        console.error("Error fetching available stock:", error);
        setStockMap({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchStock();
  }, [componentsKey]);

  return { stockMap, isLoading };
}
