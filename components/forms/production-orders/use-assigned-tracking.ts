"use client";

import { useState, useEffect } from "react";
import { getItemTrackingLines } from "@/lib/api/services/production-orders.service";

interface UseAssignedTrackingParams {
  sourceType?: number;
  sourceId?: string;
  sourceBatchName?: string;
  enabled: boolean;
}

/**
 * Hook to fetch assigned item tracking lines for an entire order or journal in a single batch request.
 * Returns a map of Line_No (Source_Ref_No_) -> boolean indicating if tracking is assigned.
 */
export function useAssignedTracking({
  sourceType,
  sourceId,
  sourceBatchName,
  enabled,
}: UseAssignedTrackingParams) {
  // Map of Source_Ref_No_ -> boolean
  const [assignedMap, setAssignedMap] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !sourceType || !sourceId) {
      setAssignedMap({});
      return;
    }

    const fetchAssignedTracking = async () => {
      setIsLoading(true);
      try {
        const lines = await getItemTrackingLines({
          sourceType,
          sourceId,
          sourceBatchName,
        });

        // Build map: Source_Ref_No_ -> true
        const map: Record<number, boolean> = {};
        lines.forEach((line) => {
          if (line.Source_Ref_No_ != null) {
            map[line.Source_Ref_No_] = true;
          }
        });

        setAssignedMap(map);
      } catch (error) {
        console.error("Error fetching assigned tracking lines:", error);
        setAssignedMap({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignedTracking();
  }, [sourceType, sourceId, sourceBatchName, enabled]);

  return { assignedMap, isLoading };
}
