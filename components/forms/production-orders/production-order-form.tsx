/**
 * Production Order Form
 * Form component for creating/editing Production Orders in FormStack
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Pencil,
  List,
  RefreshCw,
  Factory,
  MoreVertical,
  FileText,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldTitle } from "@/components/ui/field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { getAuthCredentials } from "@/lib/auth/storage";
import {
  getLOBsFromUserSetup,
  getBranchesFromUserSetup,
  getLOCsFromUserSetup,
  type DimensionValue,
} from "@/lib/api/services/dimension.service";
import {
  getItems,
  getFamilies,
  getSalesHeaders,
  getProdOrderBOMs,
  getProdOrderBOMsByItemOnly,
  getProdOrderBOMVersions,
  getItemByNo,
  type Item,
  type Family,
  type SalesHeader,
  type ProdOrderBOM,
  type ProdOrderBOMVersion,
} from "@/lib/api/services/production-order-data.service";
import {
  getProductionOrderByNo,
  getProductionOrderLines,
  getProductionOrderComponents,
  createProductionOrder,
  updateProductionOrder,
  refreshProductionOrder,
  refreshProductionOrderJournal,
  changeProductionOrderStatus,
  type ProductionOrder,
  type ProductionOrderLine,
  type ProductionOrderComponent,
} from "@/lib/api/services/production-orders.service";
import { ProductionOrderQRDialog } from "./production-order-qr-dialog";
import { ProductionOrderPostDialog } from "./production-order-post-dialog";
import { ProductionOrderLinesTable } from "./production-order-lines-table";
import { ProductionOrderComponentsTable } from "./production-order-components-table";
import { ProductionOrderLineDialog } from "./production-order-line-dialog";
import { ProductionOrderComponentDialog } from "./production-order-component-dialog";
import { ItemTrackingDialog } from "./item-tracking-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { mapSourceType } from "./utils/map-source-type";
import {
  validateProductionOrderForm,
  showValidationErrors,
} from "./utils/validation";
import {
  ApiErrorDialog,
  extractApiError,
  type ApiErrorState,
} from "./api-error-dialog";

type SourceType = "Item" | "Family" | "Sales Header" | "";
type BatchSize = "0.8" | "1.0" | "1.5" | "2.0" | "";

const SOURCE_TYPE_OPTIONS: SourceType[] = ["Item", "Family", "Sales Header"];
const BATCH_SIZE_OPTIONS: BatchSize[] = ["0.8", "1.0", "1.5", "2.0"];

interface ProductionOrderFormProps {
  tabId: string;
  formData?: Record<string, any>;
  context?: Record<string, any>;
}

export function ProductionOrderForm({
  tabId,
  formData: initialFormData,
  context,
}: ProductionOrderFormProps) {
  const {
    tab,
    registerRefresh,
    handleSuccess,
    updateFormData,
    updateTab,
    closeTab,
  } = useFormStack(tabId);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);

  // Form mode: 'create' | 'view' | 'edit'
  const [localMode, setLocalMode] = useState(context?.mode || "create");
  const isViewMode = localMode === "view";
  const isEditMode = localMode === "edit";
  const isCreateMode = localMode === "create" || (!isViewMode && !isEditMode);
  const orderNo = context?.orderNo as string | undefined;

  // Form state
  const [formState, setFormState] = useState({
    No: "",
    Description: "",
    Shortcut_Dimension_1_Code: "", // LOB
    Shortcut_Dimension_2_Code: "", // Branch Code
    Shortcut_Dimension_3_Code: "", // LOC Code
    Source_Type: "" as SourceType,
    Source_No: "",
    Quantity: "" as string | number, // Allow string for user input, parse on submit
    Due_Date: "",
    Location_Code: "",
    Hatching_Date: "",
    Prod_Bom_No: "",
    BOM_Version_No: "",
    isProdBomFromItem: false,
    Batch_Size: "" as BatchSize,
    ...initialFormData,
  });

  // Dimension dropdowns state
  const [lobs, setLobs] = useState<DimensionValue[]>([]);
  const [branches, setBranches] = useState<DimensionValue[]>([]);
  const [locs, setLocs] = useState<DimensionValue[]>([]);
  const [isLoadingDimensions, setIsLoadingDimensions] = useState(false);

  // Source No dropdown state
  const [sourceOptions, setSourceOptions] = useState<
    (Item | Family | SalesHeader)[]
  >([]);
  const [isLoadingSource, setIsLoadingSource] = useState(false);
  const [sourceSearchQuery, setSourceSearchQuery] = useState("");
  const [sourcePage, setSourcePage] = useState(1);
  const [hasMoreSource, setHasMoreSource] = useState(false);
  const [isLoadingMoreSource, setIsLoadingMoreSource] = useState(false);

  // BOM dropdown state
  const [bomOptions, setBomOptions] = useState<ProdOrderBOM[]>([]);
  const [bomVersionOptions, setBomVersionOptions] = useState<
    ProdOrderBOMVersion[]
  >([]);
  const [isLoadingBom, setIsLoadingBom] = useState(false);
  const [isLoadingBomVersions, setIsLoadingBomVersions] = useState(false);

  // Order lines and components for view/edit mode
  const [orderLines, setOrderLines] = useState<ProductionOrderLine[]>([]);
  const [orderComponents, setOrderComponents] = useState<
    ProductionOrderComponent[]
  >([]);
  const [isLoadingLines, setIsLoadingLines] = useState(false);
  const [isLoadingComponents, setIsLoadingComponents] = useState(false);
  const [isComponentsSheetOpen, setIsComponentsSheetOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isManufacturing, setIsManufacturing] = useState(false);
  const [isChangeStatusDialogOpen, setIsChangeStatusDialogOpen] =
    useState(false);

  // Line Dialog State
  const [selectedLine, setSelectedLine] = useState<ProductionOrderLine | null>(
    null,
  );
  const [selectedLineHasTracking, setSelectedLineHasTracking] = useState(false);
  const [isLineDialogOpen, setIsLineDialogOpen] = useState(false);

  // Component Dialog State
  const [selectedComponent, setSelectedComponent] =
    useState<ProductionOrderComponent | null>(null);
  const [selectedComponentHasTracking, setSelectedComponentHasTracking] =
    useState(false);
  const [isComponentDialogOpen, setIsComponentDialogOpen] = useState(false);
  const [isItemTrackingDialogOpen, setIsItemTrackingDialogOpen] =
    useState(false);

  // Track which type of item tracking we're assigning (line or component)
  const [trackingSourceType, setTrackingSourceType] = useState<
    "line" | "component"
  >("component");

  // Get logged-in user ID
  useEffect(() => {
    const credentials = getAuthCredentials();
    if (credentials) {
      setUserId(credentials.userID);
    }
  }, []);

  // Sync local mode with context
  useEffect(() => {
    if (context?.mode) {
      setLocalMode(context.mode);
    }
  }, [context?.mode]);

  // Load order data for view/edit mode
  useEffect(() => {
    if (!orderNo || localMode === "create") {
      // For create mode, mark initial load as complete immediately
      // Also mark as saved since no changes have been made yet
      setIsInitialLoadComplete(true);
      updateTab({ isSaved: true });
      return;
    }

    const loadOrderData = async () => {
      try {
        const order = await getProductionOrderByNo(orderNo);
        if (order) {
          setFormState((prev) => ({
            ...prev,
            No: order.No,
            Description: order.Description || "",
            Shortcut_Dimension_1_Code: order.Shortcut_Dimension_1_Code || "",
            Shortcut_Dimension_2_Code: order.Shortcut_Dimension_2_Code || "",
            Shortcut_Dimension_3_Code: order.Shortcut_Dimension_3_Code || "",
            Source_Type: mapSourceType(order.Source_Type),
            Source_No: order.Source_No || "",
            Quantity: order.Quantity || 0,
            Due_Date: order.Due_Date || "",
            Location_Code: order.Location_Code || "",
            Hatching_Date: order.Hatching_Date || "",
            Prod_Bom_No: order.Prod_Bom_No || "",
            BOM_Version_No: order.BOM_Version_No || "",
            isProdBomFromItem: !!order.Prod_Bom_No,
            Batch_Size: (order.Batch_Size as BatchSize) || "",
          }));
        }

        // Load order lines
        setIsLoadingLines(true);
        const lines = await getProductionOrderLines(orderNo);
        setOrderLines(lines);
        setIsLoadingLines(false);

        // Load components for all lines
        setIsLoadingComponents(true);
        const allComponents: ProductionOrderComponent[] = [];
        for (const line of lines) {
          if (line.Line_No) {
            const lineComponents = await getProductionOrderComponents(
              orderNo,
              line.Line_No,
            );
            allComponents.push(...lineComponents);
          }
        }
        setOrderComponents(allComponents);
        setIsLoadingComponents(false);

        // Mark initial load as complete after data is loaded
        // Also mark tab as saved since this is just loading existing data
        setIsInitialLoadComplete(true);
        updateTab({ isSaved: true });
      } catch (error) {
        console.error("Error loading order data:", error);
        setIsInitialLoadComplete(true);
      }
    };

    loadOrderData();
  }, [orderNo, localMode]);

  // Register refresh callback
  useEffect(() => {
    registerRefresh(async () => {
      if (orderNo) {
        // Re-fetch order data
        const order = await getProductionOrderByNo(orderNo);
        if (order) {
          setFormState((prev) => ({
            ...prev,
            No: order.No,
            Description: order.Description || "",
            Shortcut_Dimension_1_Code: order.Shortcut_Dimension_1_Code || "",
            Shortcut_Dimension_2_Code: order.Shortcut_Dimension_2_Code || "",
            Shortcut_Dimension_3_Code: order.Shortcut_Dimension_3_Code || "",
            Source_Type: mapSourceType(order.Source_Type),
            Source_No: order.Source_No || "",
            Quantity: order.Quantity || 0,
            Due_Date: order.Due_Date || "",
            Location_Code: order.Location_Code || "",
            Hatching_Date: order.Hatching_Date || "",
            Prod_Bom_No: order.Prod_Bom_No || "",
            BOM_Version_No: order.BOM_Version_No || "",
          }));
        }

        // Refresh lines and components
        const lines = await getProductionOrderLines(orderNo);
        setOrderLines(lines);

        // Always refresh components
        const allComponents: ProductionOrderComponent[] = [];
        for (const line of lines) {
          if (line.Line_No) {
            const lineComponents = await getProductionOrderComponents(
              orderNo,
              line.Line_No,
            );
            allComponents.push(...lineComponents);
          }
        }
        setOrderComponents(allComponents);
      }
    });
  }, [registerRefresh, orderNo]);

  // NOTE: Disabled formData sync to context to prevent focus loss issue.
  // The sync was causing periodic re-renders (every 300ms) which would steal focus.
  // Local formState is sufficient for form operation. If tab persistence is needed,
  // consider syncing only on blur or before close.
  //
  // const prevFormStateRef = React.useRef(formState);
  // const updateTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  //
  // useEffect(() => {
  //   if (!isInitialLoadComplete) return;
  //   if (JSON.stringify(prevFormStateRef.current) !== JSON.stringify(formState)) {
  //     prevFormStateRef.current = formState;
  //     if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
  //     updateTimeoutRef.current = setTimeout(() => {
  //       updateFormData(formState);
  //     }, 300);
  //   }
  //   return () => { if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current); };
  // }, [formState, updateFormData, isInitialLoadComplete]);

  // Load LOBs on mount (for create and edit modes)
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

  // Load Branches when LOB changes (for create and edit modes)
  useEffect(() => {
    if (!userId || !formState.Shortcut_Dimension_1_Code || isViewMode) {
      if (!isViewMode) setBranches([]);
      return;
    }

    const loadBranches = async () => {
      try {
        const branchData = await getBranchesFromUserSetup(
          formState.Shortcut_Dimension_1_Code,
          userId,
        );
        setBranches(branchData);
      } catch (error) {
        console.error("Error loading branches:", error);
      }
    };

    loadBranches();
  }, [userId, formState.Shortcut_Dimension_1_Code, isViewMode]);

  // Load LOCs when Branch changes (for create and edit modes)
  useEffect(() => {
    if (
      !userId ||
      !formState.Shortcut_Dimension_1_Code ||
      !formState.Shortcut_Dimension_2_Code ||
      isViewMode
    ) {
      if (!isViewMode) setLocs([]);
      return;
    }

    const loadLOCs = async () => {
      try {
        const locData = await getLOCsFromUserSetup(
          formState.Shortcut_Dimension_1_Code,
          formState.Shortcut_Dimension_2_Code,
          userId,
        );
        setLocs(locData);
      } catch (error) {
        console.error("Error loading LOCs:", error);
      }
    };

    loadLOCs();
  }, [
    userId,
    formState.Shortcut_Dimension_1_Code,
    formState.Shortcut_Dimension_2_Code,
    isViewMode,
  ]);

  // Load Source No options when Source Type changes or search query changes (for create and edit modes)
  useEffect(() => {
    if (!formState.Source_Type || isViewMode) {
      if (!isViewMode) {
        setSourceOptions([]);
        setHasMoreSource(false);
      }
      return;
    }

    const loadSourceOptions = async () => {
      const isLoadMore = sourcePage > 1;

      if (isLoadMore) {
        setIsLoadingMoreSource(true);
      } else {
        setIsLoadingSource(true);
      }

      try {
        let options: (Item | Family | SalesHeader)[] = [];
        const PAGE_SIZE = 50;

        switch (formState.Source_Type) {
          case "Item": {
            const skip = (sourcePage - 1) * PAGE_SIZE;
            options = await getItems(
              sourceSearchQuery || undefined,
              formState.Shortcut_Dimension_1_Code,
              skip,
              PAGE_SIZE,
            );

            // If fewer items than page size returned, we've reached the end
            setHasMoreSource(options.length === PAGE_SIZE);
            break;
          }
          case "Family":
            options = await getFamilies(sourceSearchQuery || undefined);
            setHasMoreSource(false); // Pagination not implemented for Family yet
            break;
          case "Sales Header":
            options = await getSalesHeaders(sourceSearchQuery || undefined);
            setHasMoreSource(false); // Pagination not implemented for SalesHeader yet
            break;
        }

        // Ensure selected item is always in options if it exists and not already included
        // Only do this on initial load, not when loading more pages
        if (
          !isLoadMore &&
          formState.Source_No &&
          !options.some((opt) => opt.No === formState.Source_No)
        ) {
          try {
            let selectedItem: Item | Family | SalesHeader | null = null;
            switch (formState.Source_Type) {
              case "Item":
                selectedItem = await getItemByNo(formState.Source_No);
                break;
              case "Family":
                // For Family and Sales Header, we create minimal objects
                selectedItem = {
                  No: formState.Source_No,
                  Description: formState.Source_No,
                } as Family;
                break;
              case "Sales Header":
                selectedItem = {
                  No: formState.Source_No,
                  Sell_to_Customer_Name: formState.Source_No,
                } as SalesHeader;
                break;
            }

            if (selectedItem) {
              options = [selectedItem, ...options];
            }
          } catch (error) {
            console.warn("Could not fetch selected item:", error);
          }
        }

        if (isLoadMore) {
          setSourceOptions((prev) => [...prev, ...options]);
        } else {
          setSourceOptions(options);
        }
      } catch (error) {
        console.error("Error loading source options:", {
          message: error instanceof Error ? error.message : "Unknown error",
          error,
          sourceType: formState.Source_Type,
          searchQuery: sourceSearchQuery,
        });
        if (!isLoadMore) {
          setSourceOptions([]);
        }
      } finally {
        setIsLoadingSource(false);
        setIsLoadingMoreSource(false);
      }
    };

    loadSourceOptions();
  }, [
    formState.Source_Type,
    formState.Source_No,
    formState.Shortcut_Dimension_1_Code,
    sourceSearchQuery,
    sourcePage, // Add sourcePage dependency
    isViewMode,
  ]);

  // Load BOM Versions when Prod BOM No changes
  useEffect(() => {
    if (!formState.Prod_Bom_No || formState.isProdBomFromItem || isViewMode) {
      setBomVersionOptions([]);
      return;
    }

    const loadBomVersions = async () => {
      setIsLoadingBomVersions(true);
      try {
        const versions = await getProdOrderBOMVersions(formState.Prod_Bom_No);
        setBomVersionOptions(versions);
      } catch (error) {
        console.error("Error loading BOM versions:", error);
        setBomVersionOptions([]);
      } finally {
        setIsLoadingBomVersions(false);
      }
    };

    loadBomVersions();
  }, [formState.Prod_Bom_No, formState.isProdBomFromItem, isViewMode]);

  // Load BOM options when Source_No AND Location_Code are set (only for Item type without BOM from item)
  useEffect(() => {
    // Only load BOMs if:
    // 1. Source Type is Item
    // 2. Source_No is selected
    // 3. Location_Code is selected (required for BOM API per Postman)
    // 4. BOM is not auto-filled from item
    // 5. Not in view mode
    if (
      formState.Source_Type !== "Item" ||
      !formState.Source_No ||
      !formState.Location_Code ||
      formState.isProdBomFromItem ||
      isViewMode
    ) {
      return;
    }

    const loadBomOptions = async () => {
      setIsLoadingBom(true);
      try {
        // Try primary method: BOMs filtered by Item_No AND Location_Code_1
        let boms = await getProdOrderBOMs(
          formState.Source_No,
          formState.Location_Code,
        );

        // If no BOMs found with location filter, try item-only filter
        if (boms.length === 0) {
          boms = await getProdOrderBOMsByItemOnly(formState.Source_No);
        }

        setBomOptions(boms);

        if (boms.length === 0) {
          console.warn(
            `No BOMs found for item ${formState.Source_No} with any filter`,
          );
        }
      } catch (error) {
        console.error("Error loading BOM options:", error);
        setBomOptions([]);
      } finally {
        setIsLoadingBom(false);
      }
    };

    loadBomOptions();
  }, [
    formState.Source_Type,
    formState.Source_No,
    formState.Location_Code,
    formState.isProdBomFromItem,
    isViewMode,
  ]);

  // Handlers
  const handleChange = useCallback(
    (field: string, value: string | number | boolean) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
      // Mark as unsaved when user makes changes
      updateTab({ isSaved: false });
    },
    [updateTab],
  );

  const handleLOBChange = useCallback(
    (value: string) => {
      setFormState((prev) => ({
        ...prev,
        Shortcut_Dimension_1_Code: value,
        Shortcut_Dimension_2_Code: "",
        Shortcut_Dimension_3_Code: "",
        Location_Code: "",
      }));
      updateTab({ isSaved: false });
    },
    [updateTab],
  );

  const handleBranchChange = useCallback(
    (value: string) => {
      setFormState((prev) => ({
        ...prev,
        Shortcut_Dimension_2_Code: value,
        Shortcut_Dimension_3_Code: "",
        Location_Code: "",
      }));
      updateTab({ isSaved: false });
    },
    [updateTab],
  );

  const handleLOCChange = useCallback(
    (value: string) => {
      setFormState((prev) => ({
        ...prev,
        Shortcut_Dimension_3_Code: value,
        Location_Code: value, // Prefill Location Code
      }));
      updateTab({ isSaved: false });
    },
    [updateTab],
  );

  const handleSourceTypeChange = useCallback(
    (value: SourceType) => {
      setFormState((prev) => ({
        ...prev,
        Source_Type: value,
        Source_No: "",
        Prod_Bom_No: "",
        BOM_Version_No: "",
        isProdBomFromItem: false,
      }));
      // Keep search query persistent, don't reset it
      setSourceOptions([]);
      setSourcePage(1); // Reset page
      updateTab({ isSaved: false });
    },
    [updateTab],
  );

  // Handle source search
  const handleSourceSearch = useCallback((query: string) => {
    setSourceSearchQuery(query);
    setSourcePage(1); // Reset page on search
  }, []);

  // Handle load more sources
  const handleLoadMoreSource = useCallback(() => {
    if (!hasMoreSource || isLoadingMoreSource) return;
    setSourcePage((prev) => prev + 1);
  }, [hasMoreSource, isLoadingMoreSource]);

  const handleSourceNoChange = useCallback(
    async (value: string) => {
      // Find the selected option from current options
      let selectedOption = sourceOptions.find((opt) => opt.No === value);

      // If option not found in current list, create a temporary one immediately
      if (!selectedOption) {
        // Create temporary option based on source type for immediate display
        if (formState.Source_Type === "Item") {
          selectedOption = {
            No: value,
            Description: `Loading ${value}...`,
          } as Item;
        } else if (formState.Source_Type === "Family") {
          selectedOption = {
            No: value,
            Description: `Loading ${value}...`,
          } as Family;
        } else if (formState.Source_Type === "Sales Header") {
          selectedOption = {
            No: value,
            Sell_to_Customer_Name: `Loading ${value}...`,
          } as SalesHeader;
        }

        // Add temporary option to sourceOptions immediately for display
        if (selectedOption) {
          setSourceOptions((prevOptions) => [selectedOption!, ...prevOptions]);
        }
      } else {
        // Move existing option to top
        setSourceOptions((prev) => {
          const filtered = prev.filter((opt) => opt.No !== value);
          return [selectedOption!, ...filtered];
        });
      }

      setFormState((prev) => {
        const newState = {
          ...prev,
          Source_No: value,
          Prod_Bom_No: "",
          BOM_Version_No: "",
          isProdBomFromItem: false,
        };
        return newState;
      });
      setBomOptions([]);
      // Mark as unsaved when user changes source
      updateTab({ isSaved: false });

      // Now fetch full details asynchronously and replace the temporary option
      if (formState.Source_Type === "Item") {
        try {
          const item = await getItemByNo(value);
          if (item) {
            // Replace temporary option with full item details
            setSourceOptions((prevOptions) => {
              const filtered = prevOptions.filter((opt) => opt.No !== value);
              return [item, ...filtered];
            });
            // Check for BOM
            if (item.Production_BOM_No) {
              setFormState((p) => ({
                ...p,
                Prod_Bom_No: item.Production_BOM_No || "",
                isProdBomFromItem: true,
              }));
            }
          }
        } catch (error) {
          console.error("Error fetching item details:", error);
        }
      }
    },
    [sourceOptions, formState.Source_Type, updateTab],
  );

  // Handle Refresh Production Order
  const handleRefresh = useCallback(async () => {
    if (!formState.No) return;

    setIsRefreshing(true);
    try {
      await refreshProductionOrder(formState.No);
      toast.success("Production Order refreshed successfully!");

      // Reload order data
      const order = await getProductionOrderByNo(formState.No);
      if (order) {
        setFormState((prev) => ({
          ...prev,
          Description: order.Description || "",
          Shortcut_Dimension_1_Code: order.Shortcut_Dimension_1_Code || "",
          Shortcut_Dimension_2_Code: order.Shortcut_Dimension_2_Code || "",
          Shortcut_Dimension_3_Code: order.Shortcut_Dimension_3_Code || "",
          Source_Type: mapSourceType(order.Source_Type),
          Source_No: order.Source_No || "",
          Quantity: order.Quantity || 0,
          Due_Date: order.Due_Date || "",
          Location_Code: order.Location_Code || "",
          Hatching_Date: order.Hatching_Date || "",
          Prod_Bom_No: order.Prod_Bom_No || "",
          BOM_Version_No: order.BOM_Version_No || "",
        }));
      }

      // Refresh lines and components
      const lines = await getProductionOrderLines(formState.No);
      setOrderLines(lines);

      const allComponents: ProductionOrderComponent[] = [];
      for (const line of lines) {
        if (line.Line_No) {
          const lineComponents = await getProductionOrderComponents(
            formState.No,
            line.Line_No,
          );
          allComponents.push(...lineComponents);
        }
      }
      setOrderComponents(allComponents);
    } catch (error) {
      console.error("Error refreshing production order:", error);
      const { message, code } = extractApiError(error);
      setApiError({ title: "Refresh Failed", message, code });
    } finally {
      setIsRefreshing(false);
    }
  }, [formState.No]);

  // Handle Manufacture (Change Status to Finished)
  const handleManufacture = async () => {
    if (!formState.No) return;

    // Close the dialog
    setIsChangeStatusDialogOpen(false);

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    setIsManufacturing(true);
    try {
      await changeProductionOrderStatus(formState.No, today);
      toast.success("Production Order status changed to Finished!");

      // Trigger parent refresh if callback provided
      if (
        context?.onStatusChanged &&
        typeof context.onStatusChanged === "function"
      ) {
        context.onStatusChanged();
      }

      // Close the form tab
      closeTab();
    } catch (error) {
      console.error("Error changing production order status:", error);
      const { message, code } = extractApiError(error);
      setApiError({ title: "Status Change Failed", message, code });
    } finally {
      setIsManufacturing(false);
    }
  };

  // Handle Line Row Click
  const handleLineClick = useCallback(
    (line: ProductionOrderLine, hasTracking: boolean) => {
      setSelectedLine(line);
      setSelectedLineHasTracking(hasTracking);
      setIsLineDialogOpen(true);
    },
    [],
  );

  // Handle Line Dialog Save
  const handleLineSave = useCallback(() => {
    // Refresh the order to get updated values
    handleRefresh();
  }, [handleRefresh]);

  // Handle Component Row Click
  const handleComponentClick = useCallback(
    (component: ProductionOrderComponent, hasTracking: boolean) => {
      setSelectedComponent(component);
      setSelectedComponentHasTracking(hasTracking);
      setIsComponentDialogOpen(true);
    },
    [],
  );

  // Handle Component Save
  const handleComponentSave = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  // Handle Assign Tracking Click for Components
  const handleAssignComponentTracking = useCallback(() => {
    setTrackingSourceType("component");
    setIsItemTrackingDialogOpen(true);
  }, []);

  // Handle Assign Tracking Click for Lines
  const handleAssignLineTracking = useCallback(() => {
    setTrackingSourceType("line");
    setIsItemTrackingDialogOpen(true);
  }, []);

  // Handle Item Tracking Save
  const handleItemTrackingSave = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  const handleSubmit = async () => {
    // Validate form using utility
    const validationResult = validateProductionOrderForm({
      No: formState.No,
      Description: formState.Description,
      Shortcut_Dimension_1_Code: formState.Shortcut_Dimension_1_Code,
      Shortcut_Dimension_2_Code: formState.Shortcut_Dimension_2_Code,
      Shortcut_Dimension_3_Code: formState.Shortcut_Dimension_3_Code,
      Source_Type: formState.Source_Type,
      Source_No: formState.Source_No,
      Quantity: formState.Quantity,
      Due_Date: formState.Due_Date,
      Location_Code: formState.Location_Code,
      Hatching_Date: formState.Hatching_Date,
      Prod_Bom_No: formState.Prod_Bom_No,
      BOM_Version_No: formState.BOM_Version_No,
      isProdBomFromItem: formState.isProdBomFromItem,
      Batch_Size: formState.Batch_Size,
    });

    if (!showValidationErrors(validationResult)) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (isCreateMode) {
        // Parse quantity to number for API
        const quantityValue =
          typeof formState.Quantity === "string"
            ? parseFloat(formState.Quantity) || 0
            : formState.Quantity;

        // Create new production order
        const payload = {
          Status: "Released" as const,
          Description: formState.Description,
          Source_Type: formState.Source_Type as
            | "Item"
            | "Family"
            | "Sales Header",
          Source_No: formState.Source_No,
          Quantity: quantityValue,
          Due_Date: formState.Due_Date,
          Location_Code: formState.Location_Code,
          Hatching_Date: formState.Hatching_Date || undefined,
          Shortcut_Dimension_1_Code: formState.Shortcut_Dimension_1_Code,
          Shortcut_Dimension_2_Code: formState.Shortcut_Dimension_2_Code,
          Shortcut_Dimension_3_Code: formState.Shortcut_Dimension_3_Code,
          Prod_Bom_No: formState.Prod_Bom_No || undefined,
          // Only include BOM_Version_No if Prod_Bom_No was manually selected (not from item)
          BOM_Version_No:
            !formState.isProdBomFromItem && formState.BOM_Version_No
              ? formState.BOM_Version_No
              : undefined,
          Batch_Size: formState.Batch_Size || undefined,
        };

        const createdOrder = await createProductionOrder(payload);

        // Refresh journal entries in the backend
        try {
          await refreshProductionOrderJournal(createdOrder.No);
        } catch (refreshError) {
          console.warn("Failed to refresh journal entries:", refreshError);
          // Don't block the order creation flow if refresh fails
        }

        // Notify parent to add order to list (optimistic update)
        if (
          context?.onOrderCreated &&
          typeof context.onOrderCreated === "function"
        ) {
          context.onOrderCreated(createdOrder);
        }

        toast.success(
          `Production Order ${createdOrder.No} created successfully!`,
        );

        // Switch to view mode instead of closing
        setFormState((prev) => ({
          ...prev,
          No: createdOrder.No,
        }));
        setLocalMode("view");
        updateTab({
          title: `View Order: ${createdOrder.No}`,
          context: { ...context, mode: "view", orderNo: createdOrder.No },
        });
      } else {
        // Edit mode - update production order
        if (!formState.No) {
          throw new Error("Production Order No is required for update");
        }

        // Build update payload with only changed fields
        const updatePayload: {
          Description?: string;
          Quantity?: number;
          Due_Date?: string;
          Location_Code?: string;
          Batch_Size?: string;
        } = {};

        // Only include fields that should be updateable
        if (formState.Description) {
          updatePayload.Description = formState.Description;
        }
        if (formState.Quantity) {
          updatePayload.Quantity =
            typeof formState.Quantity === "string"
              ? parseFloat(formState.Quantity)
              : formState.Quantity;
        }
        if (formState.Due_Date) {
          updatePayload.Due_Date = formState.Due_Date;
        }
        if (formState.Location_Code) {
          updatePayload.Location_Code = formState.Location_Code;
        }
        if (formState.Batch_Size) {
          updatePayload.Batch_Size = formState.Batch_Size;
        }

        await updateProductionOrder(formState.No, updatePayload);

        toast.success(`Production Order ${formState.No} updated successfully!`);

        // Refresh order data
        const updatedOrder = await getProductionOrderByNo(formState.No);
        if (updatedOrder) {
          setFormState((prev) => ({
            ...prev,
            Description: updatedOrder.Description || "",
            Quantity: updatedOrder.Quantity || 0,
            Due_Date: updatedOrder.Due_Date || "",
            Location_Code: updatedOrder.Location_Code || "",
            Batch_Size: (updatedOrder.Batch_Size as BatchSize) || "",
          }));
        }

        // Switch back to view mode
        setLocalMode("view");
        updateTab({
          context: { ...context, mode: "view" },
          isSaved: true,
        });

        // Refresh lines and components in case quantity change affected them
        await handleRefresh();
      }
    } catch (error) {
      console.error("Error submitting Production Order:", error);
      const { message, code } = extractApiError(error);
      const errorTitle = isCreateMode
        ? "Create Order Failed"
        : "Update Order Failed";
      setApiError({ title: errorTitle, message, code });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert source options to SearchableSelectOption format
  const sourceSelectOptions: SearchableSelectOption[] = sourceOptions.map(
    (opt) => {
      let label = opt.No;
      if ("Description" in opt && opt.Description) {
        label = `${opt.No} - ${opt.Description}`;
      } else if ("Sell_to_Customer_Name" in opt && opt.Sell_to_Customer_Name) {
        label = `${opt.No} - ${opt.Sell_to_Customer_Name}`;
      }
      return {
        value: opt.No,
        label,
        description:
          "Description" in opt && typeof opt.Description === "string"
            ? opt.Description
            : undefined,
      };
    },
  );

  // Check if BOM fields should be shown
  const showBomFields = formState.Source_Type === "Item";
  const isBomEditable =
    showBomFields && !formState.isProdBomFromItem && !isViewMode;
  const showBomVersion =
    showBomFields && !formState.isProdBomFromItem && formState.Prod_Bom_No;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-6 [overflow-anchor:none]">
        {/* Header with action buttons - Only show for created orders */}
        {!isCreateMode && formState.No && (
          <div className="mb-6 flex items-center justify-between gap-2">
            <h2 className="min-w-0 truncate text-lg font-semibold">
              {isViewMode ? "View" : "Edit"} Production Order: {formState.No}
            </h2>
            <div className="flex shrink-0 items-center gap-2">
              {/* Buttons visible on larger screens - hidden progressively */}
              {/* Post Order - hidden on xs, visible on sm+ */}
              <div className="hidden sm:block">
                <ProductionOrderPostDialog
                  prodOrderNo={formState.No}
                  userId={userId || ""}
                />
              </div>
              {/* QR Code - hidden on xs/sm, visible on md+ */}
              <div className="hidden md:block">
                <ProductionOrderQRDialog prodOrderNo={formState.No} />
              </div>
              {/* Refresh - hidden on xs/sm/md, visible on lg+ */}
              <div className="hidden lg:block">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing || isManufacturing}
                >
                  {isRefreshing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </div>
              {/* Change Status - hidden on xs/sm/md/lg, visible on xl+ */}
              <div className="hidden xl:block">
                <AlertDialog
                  open={isChangeStatusDialogOpen}
                  onOpenChange={setIsChangeStatusDialogOpen}
                >
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      disabled={isRefreshing || isManufacturing}
                    >
                      {isManufacturing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Factory className="mr-2 h-4 w-4" />
                      )}
                      Change Status
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Change Production Order Status?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will change the status of production order{" "}
                        <strong>{formState.No}</strong> to Finished. This action
                        cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleManufacture}>
                        Confirm
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Overflow dropdown - shows items hidden at current breakpoint */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="xl:hidden">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {/* Post Order - show in dropdown on xs only */}
                  <DropdownMenuItem
                    className="sm:hidden"
                    onClick={() => {
                      // Trigger the sheet by programmatically clicking
                      const trigger = document.querySelector(
                        "[data-post-order-trigger]",
                      );
                      if (trigger instanceof HTMLElement) trigger.click();
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Post Order
                  </DropdownMenuItem>
                  {/* QR Code - show in dropdown on xs/sm */}
                  <DropdownMenuItem
                    className="md:hidden"
                    onClick={() => {
                      const trigger =
                        document.querySelector("[data-qr-trigger]");
                      if (trigger instanceof HTMLElement) trigger.click();
                    }}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    QR Code
                  </DropdownMenuItem>
                  {/* Refresh - show in dropdown on xs/sm/md */}
                  <DropdownMenuItem
                    className="lg:hidden"
                    onClick={handleRefresh}
                    disabled={isRefreshing || isManufacturing}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </DropdownMenuItem>
                  {/* Change Status - always in dropdown except xl */}
                  <DropdownMenuItem
                    onClick={() => setIsChangeStatusDialogOpen(true)}
                    disabled={isRefreshing || isManufacturing}
                  >
                    <Factory className="mr-2 h-4 w-4" />
                    Change Status
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="space-y-2">
            <FieldTitle required>LOB</FieldTitle>
            {isViewMode ? (
              <Input
                value={formState.Shortcut_Dimension_1_Code || "-"}
                disabled
                className="bg-muted"
              />
            ) : (
              <Select
                value={formState.Shortcut_Dimension_1_Code}
                onValueChange={handleLOBChange}
                disabled={isLoadingDimensions}
              >
                <SelectTrigger className="w-full">
                  {isLoadingDimensions ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <SelectValue placeholder="Select LOB" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {lobs.map((l) => (
                    <SelectItem key={l.Code} value={l.Code}>
                      {l.Code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <FieldTitle required>Branch</FieldTitle>
            {isViewMode ? (
              <Input
                value={formState.Shortcut_Dimension_2_Code || "-"}
                disabled
                className="bg-muted"
              />
            ) : (
              <Select
                value={formState.Shortcut_Dimension_2_Code}
                onValueChange={handleBranchChange}
                disabled={!formState.Shortcut_Dimension_1_Code}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.Code} value={b.Code}>
                      {b.Code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <FieldTitle required>LOC</FieldTitle>
            {isViewMode ? (
              <Input
                value={formState.Shortcut_Dimension_3_Code || "-"}
                disabled
                className="bg-muted"
              />
            ) : (
              <Select
                value={formState.Shortcut_Dimension_3_Code}
                onValueChange={handleLOCChange}
                disabled={!formState.Shortcut_Dimension_2_Code}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select LOC" />
                </SelectTrigger>
                <SelectContent>
                  {locs.map((l) => (
                    <SelectItem key={l.Code} value={l.Code}>
                      {l.Code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Order No - only show in view mode (auto-generated) */}
          {isViewMode && (
            <div className="space-y-2">
              <FieldTitle>Order No</FieldTitle>
              <Input
                value={formState.No || "-"}
                disabled
                className="bg-muted"
              />
            </div>
          )}
          <div className="space-y-2">
            <FieldTitle required>Description</FieldTitle>
            {isViewMode ? (
              <Input
                value={formState.Description || "-"}
                disabled
                className="bg-muted"
              />
            ) : (
              <div className="space-y-1">
                <Input
                  value={formState.Description}
                  onChange={(e) =>
                    handleChange("Description", e.target.value.slice(0, 100))
                  }
                  placeholder="Enter description"
                  maxLength={100}
                />
                <p className="text-muted-foreground text-right text-xs">
                  {formState.Description?.length || 0}/100 characters
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <FieldTitle required>Source Type</FieldTitle>
            {isViewMode ? (
              <Input
                value={formState.Source_Type || "-"}
                disabled
                className="bg-muted"
              />
            ) : (
              <Select
                value={formState.Source_Type}
                onValueChange={(v) => handleSourceTypeChange(v as SourceType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select source type" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPE_OPTIONS.filter(Boolean).map((st) => (
                    <SelectItem key={st} value={st}>
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <FieldTitle required>Source No</FieldTitle>
            {isViewMode ? (
              <Input
                value={formState.Source_No || "-"}
                disabled
                className="bg-muted"
              />
            ) : (
              <SearchableSelect
                value={formState.Source_No}
                onValueChange={handleSourceNoChange}
                options={sourceSelectOptions}
                placeholder="Select or enter source"
                searchPlaceholder={
                  formState.Source_Type === "Item"
                    ? "Search by No or Description..."
                    : formState.Source_Type === "Family"
                      ? "Search by No or Description..."
                      : "Search by No or Customer Name..."
                }
                emptyText={
                  sourceSearchQuery.length > 0 && sourceSearchQuery.length < 2
                    ? "Type at least 2 characters to search"
                    : "No results found"
                }
                disabled={!formState.Source_Type}
                isLoading={isLoadingSource}
                onSearch={handleSourceSearch}
                onLoadMore={handleLoadMoreSource}
                hasMore={hasMoreSource}
                isLoadingMore={isLoadingMoreSource}
                allowCustomValue
              />
            )}
          </div>
          <div className="space-y-2">
            <FieldTitle required>Quantity</FieldTitle>
            {isViewMode ? (
              <Input
                value={formState.Quantity || "-"}
                disabled
                className="bg-muted"
              />
            ) : (
              <Input
                type="text"
                inputMode="decimal"
                value={formState.Quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  // Allow empty, digits and one decimal point
                  if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                    handleChange("Quantity", val);
                  }
                }}
                placeholder="Enter quantity"
              />
            )}
          </div>

          <div className="space-y-2">
            <FieldTitle required>Due Date</FieldTitle>
            {isViewMode ? (
              <Input
                value={formState.Due_Date || "-"}
                disabled
                className="bg-muted"
              />
            ) : (
              <Input
                type="date"
                value={formState.Due_Date}
                onChange={(e) => handleChange("Due_Date", e.target.value)}
              />
            )}
          </div>
          <div className="space-y-2">
            <FieldTitle required>Location Code</FieldTitle>
            {isViewMode ? (
              <Input
                value={formState.Location_Code || "-"}
                disabled
                className="bg-muted"
              />
            ) : (
              <Select
                disabled
                value={formState.Location_Code}
                onValueChange={(v) => handleChange("Location_Code", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locs.map((l) => (
                    <SelectItem key={l.Code} value={l.Code}>
                      {l.Code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <FieldTitle>Hatching Date</FieldTitle>
            {isViewMode ? (
              <Input
                value={formState.Hatching_Date || "-"}
                disabled
                className="bg-muted"
              />
            ) : (
              <Input
                type="date"
                value={formState.Hatching_Date}
                onChange={(e) => handleChange("Hatching_Date", e.target.value)}
              />
            )}
          </div>

          {/* BOM Fields */}
          {showBomFields && (
            <>
              {formState.isProdBomFromItem ? (
                <div className="space-y-2">
                  <FieldTitle required>Prod. BOM No</FieldTitle>
                  <Input
                    value={formState.Prod_Bom_No || "-"}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-muted-foreground text-xs">
                    Auto-filled from selected item
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <FieldTitle required>Prod. BOM No</FieldTitle>
                  {isViewMode ? (
                    <Input
                      value={formState.Prod_Bom_No || "-"}
                      disabled
                      className="bg-muted"
                    />
                  ) : !formState.Location_Code ? (
                    <div>
                      <Input
                        value=""
                        disabled
                        placeholder="Select Location Code first"
                        className="bg-muted"
                      />
                      <p className="text-muted-foreground mt-1 text-xs">
                        Location Code is required to load location-specific
                        BOMs. Item-only BOMs will be loaded as fallback.
                      </p>
                    </div>
                  ) : bomOptions.length === 0 && !isLoadingBom ? (
                    <div>
                      <Input
                        value=""
                        disabled
                        placeholder="No BOM No. available"
                        className="bg-muted"
                      />
                      <p className="text-muted-foreground mt-1 text-xs">
                        No BOMs found for this item/location
                      </p>
                    </div>
                  ) : (
                    <Select
                      value={formState.Prod_Bom_No}
                      onValueChange={(v) => handleChange("Prod_Bom_No", v)}
                      disabled={isLoadingBom}
                    >
                      <SelectTrigger className="w-full">
                        {isLoadingBom ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading...</span>
                          </div>
                        ) : (
                          <SelectValue placeholder="Select BOM" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {bomOptions.map((b) => (
                          <SelectItem key={b.No} value={b.No}>
                            {b.Description
                              ? `${b.No} - ${b.Description}`
                              : b.No}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
              {showBomVersion && (
                <div className="space-y-2">
                  <FieldTitle>BOM Version No</FieldTitle>
                  {isViewMode ? (
                    <Input
                      value={formState.BOM_Version_No || "-"}
                      disabled
                      className="bg-muted"
                    />
                  ) : isLoadingBomVersions ? (
                    <div className="bg-muted flex h-9 items-center gap-2 rounded-md border px-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading versions...</span>
                    </div>
                  ) : bomVersionOptions.length === 0 ? (
                    <div>
                      <Input
                        value=""
                        disabled
                        placeholder="No versions available"
                        className="bg-muted"
                      />
                      <p className="text-muted-foreground mt-1 text-xs">
                        This BOM has no versions defined
                      </p>
                    </div>
                  ) : (
                    <Select
                      value={formState.BOM_Version_No}
                      onValueChange={(v) => handleChange("BOM_Version_No", v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select version" />
                      </SelectTrigger>
                      <SelectContent>
                        {bomVersionOptions.map((v) => (
                          <SelectItem
                            key={v.Version_Code}
                            value={v.Version_Code}
                          >
                            {v.Description
                              ? `${v.Version_Code} - ${v.Description}`
                              : v.Version_Code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <FieldTitle>Batch Size (In TON)</FieldTitle>
            {isViewMode ? (
              <Input
                value={formState.Batch_Size || "-"}
                disabled
                className="bg-muted"
              />
            ) : (
              <Select
                value={formState.Batch_Size}
                onValueChange={(v) =>
                  handleChange("Batch_Size", v as BatchSize)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select batch size" />
                </SelectTrigger>
                <SelectContent>
                  {BATCH_SIZE_OPTIONS.filter(Boolean).map((bs) => (
                    <SelectItem key={bs} value={bs}>
                      {bs}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Order Lines - Only for view/edit mode */}
          {!isCreateMode && (
            <div className="col-span-full space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-muted-foreground text-sm font-medium">
                  Release Production Order Line
                </h3>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsComponentsSheetOpen(true)}
                  disabled={isLoadingComponents}
                >
                  {isLoadingComponents ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <List className="mr-2 h-4 w-4" />
                  )}
                  View Components ({orderComponents.length})
                </Button>
              </div>
              <ProductionOrderLinesTable
                lines={orderLines}
                isLoading={isLoadingLines}
                onRowClick={handleLineClick}
              />
            </div>
          )}

          {/* Components Sheet */}
          <Sheet
            open={isComponentsSheetOpen}
            onOpenChange={setIsComponentsSheetOpen}
          >
            <SheetContent
              side="right"
              className="flex w-screen flex-col gap-0 overflow-y-auto p-0 md:w-[75vw] lg:w-[50vw]"
            >
              <SheetHeader className="bg-background sticky top-0 z-10 border-b px-6 py-4">
                <SheetTitle>Production Order Components</SheetTitle>
              </SheetHeader>
              <div className="flex-1 px-6 py-4">
                <ProductionOrderComponentsTable
                  components={orderComponents}
                  isLoading={isLoadingComponents}
                  onRowClick={handleComponentClick}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-4">
        {isViewMode ? (
          <Button
            onClick={() => {
              setLocalMode("edit");
              updateTab({ context: { ...context, mode: "edit" } });
            }}
            className="w-full"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Order
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isCreateMode ? "Create Order" : "Save Changes"}
          </Button>
        )}
      </div>

      <ProductionOrderLineDialog
        open={isLineDialogOpen}
        onOpenChange={setIsLineDialogOpen}
        line={selectedLine}
        hasTracking={selectedLineHasTracking}
        onSave={handleLineSave}
        onAssignTracking={handleAssignLineTracking}
      />

      <ProductionOrderComponentDialog
        open={isComponentDialogOpen}
        onOpenChange={setIsComponentDialogOpen}
        component={selectedComponent}
        hasTracking={selectedComponentHasTracking}
        onSave={handleComponentSave}
        onAssignTracking={handleAssignComponentTracking}
      />

      <ItemTrackingDialog
        open={isItemTrackingDialogOpen}
        onOpenChange={setIsItemTrackingDialogOpen}
        component={
          trackingSourceType === "component" ? selectedComponent : undefined
        }
        line={trackingSourceType === "line" ? selectedLine : undefined}
        prodOrderNo={formState.No}
        onSave={handleItemTrackingSave}
      />

      <ApiErrorDialog error={apiError} onClose={() => setApiError(null)} />
    </div>
  );
}
