"use client";

import { useState, useEffect, useMemo } from "react";
import { getItemsByNos } from "@/lib/api/services/item.service";

/**
 * Item with Item_No field - works for both ProductionOrderLine and ProductionOrderComponent
 */
interface ItemWithNo {
  Item_No: string;
  [key: string]: unknown;
}

/**
 * Hook to fetch item tracking info for production order lines or components
 * Returns a map of Item_No -> hasTrackingCode (true if Item_Tracking_Code is non-empty)
 */
export function useItemTracking<T extends ItemWithNo>(items: T[]) {
  const [trackingMap, setTrackingMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Stabilize the dependency - only re-fetch when the set of item numbers actually changes
  const itemNosKey = useMemo(() => {
    const uniqueNos = [
      ...new Set(items.map((item) => item.Item_No).filter(Boolean)),
    ];
    uniqueNos.sort();
    return uniqueNos.join(",");
  }, [items]);

  useEffect(() => {
    if (!itemNosKey) {
      setTrackingMap({});
      return;
    }

    const fetchItemTracking = async () => {
      setIsLoading(true);
      try {
        const uniqueItemNos = itemNosKey.split(",");

        const fetchedItems = await getItemsByNos(uniqueItemNos);

        // Build map: Item_No -> hasTrackingCode (Normalized)
        const map: Record<string, boolean> = {};
        fetchedItems.forEach((item) => {
          if (item.No) {
            const key = item.No.trim().toLowerCase();
            map[key] = !!(
              item.Item_Tracking_Code && item.Item_Tracking_Code.trim()
            );
          }
        });

        setTrackingMap(map);
      } catch (error) {
        console.error("Error fetching item tracking info:", error);
        setTrackingMap({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchItemTracking();
  }, [itemNosKey]);

  return { trackingMap, isLoading };
}
