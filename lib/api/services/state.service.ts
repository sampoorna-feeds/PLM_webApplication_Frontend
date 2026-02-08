/**
 * State API Service
 * Handles fetching states with postcode validation ranges from ERP OData V4 API
 */

import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

export interface State {
  Code: string;
  Description: string;
  From_PIN_Code: string; // String from API (e.g., "560")
  To_PIN_Code: string; // String from API (e.g., "591")
  Union_Territory?: boolean;
  State_Code_for_eTDS_TCS?: string;
  State_Code_GST_Reg_No?: string;
}

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

// Cache for states (rarely changes)
let statesCache: State[] | null = null;
let statesCacheError: boolean = false; // Track if we've already failed to prevent retries
let loadingPromise: Promise<State[]> | null = null; // Track ongoing request

/**
 * Get all states with postcode validation ranges
 * States are cached since they rarely change
 */
export async function getStates(): Promise<State[]> {
  // Return cached data if available
  if (statesCache) {
    return statesCache;
  }

  // If we've already failed, don't retry
  if (statesCacheError) {
    return [];
  }

  // If there's an ongoing request, return that promise
  if (loadingPromise) {
    return loadingPromise;
  }

  // Create a new loading promise
  loadingPromise = (async () => {
    try {
      const query = buildODataQuery({
        $select: "Code,Description,From_PIN_Code,To_PIN_Code",
        $orderby: "Description",
      });

      const endpoint = `/State?company='${encodeURIComponent(COMPANY)}'&${query}`;
      const response = await apiGet<ODataResponse<State>>(endpoint);

      if (response.value && response.value.length > 0) {
        statesCache = response.value;
        return statesCache;
      }

      // Return empty array if no data
      statesCache = [];
      return [];
    } catch (error) {
      console.error("Error fetching states:", error);
      // Mark that we've failed to prevent future retries
      statesCacheError = true;
      // Return empty array on error - form will still work without state validation
      return [];
    } finally {
      // Clear loading promise
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

/**
 * Clear states cache (useful for testing or if states are updated)
 */
export function clearStatesCache(): void {
  statesCache = null;
  statesCacheError = false; // Allow retries after clearing cache
}
