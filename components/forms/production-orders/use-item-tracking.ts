"use client";

import { useState, useEffect } from 'react';
import { getItemsByNos } from '@/lib/api/services/item.service';

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

  useEffect(() => {
    if (items.length === 0) {
      setTrackingMap({});
      return;
    }

    const fetchItemTracking = async () => {
      setIsLoading(true);
      try {
        // Get unique Item_No values
        const uniqueItemNos = [...new Set(items.map(item => item.Item_No).filter(Boolean))];
        
        if (uniqueItemNos.length === 0) {
          setTrackingMap({});
          return;
        }

        const fetchedItems = await getItemsByNos(uniqueItemNos);
        
        // Build map: Item_No -> hasTrackingCode (Normalized)
        const map: Record<string, boolean> = {};
        fetchedItems.forEach(item => {
          if (item.No) {
             const key = item.No.trim().toLowerCase();
             map[key] = !!(item.Item_Tracking_Code && item.Item_Tracking_Code.trim());
          }
        });
        
        setTrackingMap(map);
      } catch (error) {
        console.error('Error fetching item tracking info:', error);
        setTrackingMap({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchItemTracking();
  }, [items]);

  return { trackingMap, isLoading };
}
