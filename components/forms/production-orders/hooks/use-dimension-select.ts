/**
 * Hook for managing dimension dropdowns (LOB, Branch, LOC)
 * Handles cascading selection logic
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getLOBsFromUserSetup,
  getBranchesFromUserSetup,
  getLOCsFromUserSetup,
  type DimensionValue,
} from "@/lib/api/services/dimension.service";

interface UseDimensionSelectOptions {
  userId?: string;
  isViewMode: boolean;
  lob: string;
  branch: string;
}

interface UseDimensionSelectResult {
  // Dropdown options
  lobs: DimensionValue[];
  branches: DimensionValue[];
  locs: DimensionValue[];

  // Loading state
  isLoadingDimensions: boolean;

  // Helpers
  refreshDimensions: () => void;
}

export function useDimensionSelect(
  options: UseDimensionSelectOptions,
): UseDimensionSelectResult {
  const { userId, isViewMode, lob, branch } = options;

  const [lobs, setLobs] = useState<DimensionValue[]>([]);
  const [branches, setBranches] = useState<DimensionValue[]>([]);
  const [locs, setLocs] = useState<DimensionValue[]>([]);
  const [isLoadingDimensions, setIsLoadingDimensions] = useState(false);

  // Load LOBs on mount
  useEffect(() => {
    if (!userId || isViewMode) return;

    const loadLOBs = async () => {
      setIsLoadingDimensions(true);
      try {
        const lobData = await getLOBsFromUserSetup(userId);
        setLobs(lobData);
      } catch (error) {
        console.error("Error loading LOBs:", error);
      } finally {
        setIsLoadingDimensions(false);
      }
    };

    loadLOBs();
  }, [userId, isViewMode]);

  // Load Branches when LOB changes
  useEffect(() => {
    if (!userId || !lob || isViewMode) {
      if (!isViewMode) setBranches([]);
      return;
    }

    const loadBranches = async () => {
      try {
        const branchData = await getBranchesFromUserSetup(lob, userId);
        setBranches(branchData);
      } catch (error) {
        console.error("Error loading branches:", error);
      }
    };

    loadBranches();
  }, [userId, lob, isViewMode]);

  // Load LOCs when Branch changes
  useEffect(() => {
    if (!userId || !lob || !branch || isViewMode) {
      if (!isViewMode) setLocs([]);
      return;
    }

    const loadLOCs = async () => {
      try {
        const locData = await getLOCsFromUserSetup(lob, branch, userId);
        setLocs(locData);
      } catch (error) {
        console.error("Error loading LOCs:", error);
      }
    };

    loadLOCs();
  }, [userId, lob, branch, isViewMode]);

  const refreshDimensions = useCallback(() => {
    // Reset all dimensions
    setLobs([]);
    setBranches([]);
    setLocs([]);
  }, []);

  return {
    lobs,
    branches,
    locs,
    isLoadingDimensions,
    refreshDimensions,
  };
}
