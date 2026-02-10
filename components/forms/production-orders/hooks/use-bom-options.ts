/**
 * useBomOptions Hook
 * Encapsulates BOM dropdown logic for Production Order form
 * following Single Responsibility Principle
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getProdOrderBOMs,
  getProdOrderBOMsByItemOnly,
  getProdOrderBOMVersions,
  type ProdOrderBOM,
  type ProdOrderBOMVersion,
} from "@/lib/api/services/production-order-data.service";

interface UseBomOptionsParams {
  sourceType: string;
  sourceNo: string;
  locationCode: string;
  isProdBomFromItem: boolean;
  isViewMode: boolean;
}

interface UseBomOptionsReturn {
  bomOptions: ProdOrderBOM[];
  setBomOptions: React.Dispatch<React.SetStateAction<ProdOrderBOM[]>>;
  bomVersionOptions: ProdOrderBOMVersion[];
  isLoadingBom: boolean;
  isLoadingBomVersions: boolean;
  loadBomVersions: (bomNo: string) => Promise<void>;
}

export function useBomOptions({
  sourceType,
  sourceNo,
  locationCode,
  isProdBomFromItem,
  isViewMode,
}: UseBomOptionsParams): UseBomOptionsReturn {
  const [bomOptions, setBomOptions] = useState<ProdOrderBOM[]>([]);
  const [bomVersionOptions, setBomVersionOptions] = useState<
    ProdOrderBOMVersion[]
  >([]);
  const [isLoadingBom, setIsLoadingBom] = useState(false);
  const [isLoadingBomVersions, setIsLoadingBomVersions] = useState(false);

  // Load BOM options when source changes
  useEffect(() => {
    // Only load BOMs for Items and when BOM is not from item
    if (
      sourceType !== "Item" ||
      !sourceNo ||
      !locationCode ||
      isProdBomFromItem ||
      isViewMode
    ) {
      if (!isViewMode && !isProdBomFromItem) {
        setBomOptions([]);
      }
      return;
    }

    const loadBomOptions = async () => {
      setIsLoadingBom(true);
      try {
        // Try primary method: BOMs filtered by Item_No AND Location_Code_1
        let boms = await getProdOrderBOMs(sourceNo, locationCode);

        // If no BOMs found with location filter, try item-only filter
        if (!boms.length) {
          boms = await getProdOrderBOMsByItemOnly(sourceNo);
        }
        setBomOptions(boms);
      } catch (error) {
        console.error("Error loading BOM options:", error);
        setBomOptions([]);
      } finally {
        setIsLoadingBom(false);
      }
    };

    loadBomOptions();
  }, [sourceType, sourceNo, locationCode, isProdBomFromItem, isViewMode]);

  // Load BOM versions for a specific BOM
  const loadBomVersions = useCallback(async (bomNo: string) => {
    if (!bomNo) {
      setBomVersionOptions([]);
      return;
    }

    setIsLoadingBomVersions(true);
    try {
      const versions = await getProdOrderBOMVersions(bomNo);
      setBomVersionOptions(versions);
    } catch (error) {
      console.error("Error loading BOM versions:", error);
      setBomVersionOptions([]);
    } finally {
      setIsLoadingBomVersions(false);
    }
  }, []);

  return {
    bomOptions,
    setBomOptions,
    bomVersionOptions,
    isLoadingBom,
    isLoadingBomVersions,
    loadBomVersions,
  };
}
