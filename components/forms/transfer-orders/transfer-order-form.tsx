import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  getBranches,
  getBranchesFromUserSetup,
  getLOBs,
  getLOBsFromUserSetup,
  getWebUserSetup,
  getAllLOCsFromUserSetup,
  type DimensionValue,
  type WebUserSetup,
} from "@/lib/api/services/dimension.service";
import {
  getAllLocationCodes,
  getLocationCodes,
  type LocationCode,
} from "@/lib/api/services/production-order-data.service";
import {
  createTransferOrder,
  deleteTransferLine,
  getTransferOrderByNo,
  getTransferOrderLines,
  patchTransferOrder,
  postTransferOrder,
  reopenTransferOrder,
  type TransferLine,
  type TransferOrder,
} from "@/lib/api/services/transfer-orders.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getVendors,
  getTransporters,
  searchTransporters,
  searchVendors,
  type Vendor,
} from "@/lib/api/services/vendor.service";
import { getAuthCredentials } from "@/lib/auth/storage";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { cn } from "@/lib/utils";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { TransferOrderLineDialog } from "./transfer-order-line-dialog";
import { TransferOrderLinesTable } from "./transfer-order-lines-table";
import { TransferOrderLineDetailsDialog } from "./transfer-order-line-details-dialog";

interface TransferOrderFormProps {
  tabId: string;
  formData?: Record<string, any>;
  context?: Record<string, any>;
}

export function TransferOrderForm({
  tabId,
  formData: initialFormData,
  context,
}: TransferOrderFormProps) {
  const { handleSuccess, updateTab, registerRefresh } = useFormStack(tabId);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form mode: 'create' | 'view' | 'edit'
  const [localMode, setLocalMode] = useState(context?.mode || "create");
  const isViewMode = localMode === "view" || context?.orderNo;
  const orderNo = context?.orderNo as string | undefined;

  // Form state
  const [formState, setFormState] = useState<Partial<TransferOrder>>({
    No: "",
    Transfer_from_Code: "",
    Transfer_from_Name: "",
    Transfer_to_Code: "",
    Transfer_to_Name: "",
    External_Document_No: "",
    In_Transit_Code: "IN-TRANSIT",
    Posting_Date: new Date().toISOString().split("T")[0],
    Status: "Open",
    Vehicle_No: "",
    LR_RR_No: "",
    LR_RR_Date: "",
    Distance_Km: 0,
    Freight_Value: 0,
    Transporter_Code: "",
    Transporter_Name: "",
    Mode_of_Transport: "",
    Assigned_User_ID: "",
    Direct_Transfer: false,
    Shortcut_Dimension_1_Code: "", // LOB
    Shortcut_Dimension_2_Code: "", // Branch Code
    Shipment_Date: new Date().toISOString().split("T")[0],
    Receipt_Date: new Date().toISOString().split("T")[0],
    Shipment_Method_Code: "",
    Shipping_Agent_Code: "",
    Shipping_Advice: "Partial",
    ...initialFormData,
  });

  const [originalState, setOriginalState] = useState<Partial<TransferOrder>>(
    {},
  );

  // Lines state
  const [lines, setLines] = useState<TransferLine[]>([]);
  const [isLoadingLines, setIsLoadingLines] = useState(false);
  const [selectedLine, setSelectedLine] = useState<TransferLine | null>(null);
  const [isLineDialogOpen, setIsLineDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Dimension dropdowns state
  const [lobs, setLobs] = useState<DimensionValue[]>([]);
  const [branches, setBranches] = useState<DimensionValue[]>([]);
  const [locations, setLocations] = useState<LocationCode[]>([]); // These will be used for Transfer-from
  const [allLocations, setAllLocations] = useState<LocationCode[]>([]); // These will be used for Transfer-to
  const [authorizedLOCs, setAuthorizedLOCs] = useState<string[]>([]);
  const [transporters, setTransporters] = useState<Vendor[]>([]);
  const [isLoadingDimensions, setIsLoadingDimensions] = useState(false);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [postSelection, setPostSelection] = useState<"ship" | "receive">("ship");

  // Debug: Monitor locations state changes
  useEffect(() => {
    console.log("DEBUG: Authorized locations (From):", locations.length, locations);
    console.log("DEBUG: All locations (To):", allLocations.length);
  }, [locations, allLocations]);

  const [userSetup, setUserSetup] = useState<WebUserSetup[]>([]);

  // Get logged-in user ID and setup
  useEffect(() => {
    const loadUserContext = async () => {
      const credentials = getAuthCredentials();
      if (credentials) {
        setUserId(credentials.userID);
        if (!isViewMode) {
          setFormState((prev) => ({
            ...prev,
            Assigned_User_ID: credentials.userID,
          }));
        }

        try {
          const setup = await getWebUserSetup(credentials.userID);
          setUserSetup(setup);
        } catch (err) {
          console.error("Error loading user setup:", err);
        }
      }
    };
    loadUserContext();
  }, [isViewMode]);

  // Load Order Data and Lines if orderNo exists
  const fetchOrderData = useCallback(async (no: string) => {
    setIsLoading(true);
    try {
      const order = await getTransferOrderByNo(no);
      if (order) {
        setFormState(order);
        setOriginalState(order);
        setIsLoadingLines(true);
        const linesData = await getTransferOrderLines(no);
        setLines(linesData);
      }
    } catch (err) {
      console.error("Error fetching order data:", err);
      toast.error("Failed to load order data");
    } finally {
      setIsLoading(false);
      setIsLoadingLines(false);
    }
  }, []);

  useEffect(() => {
    if (orderNo) {
      fetchOrderData(orderNo);
    }
  }, [orderNo, fetchOrderData]);

  // Register refresh callback
  useEffect(() => {
    if (orderNo) {
      registerRefresh(() => fetchOrderData(orderNo));
    }
  }, [orderNo, fetchOrderData, registerRefresh]);

  // Resolve Location Names and auto-populate dimensions from setup when Transfer_from_Code changes
  useEffect(() => {
    if (locations.length > 0) {
      const fromLoc = locations.find(
        (l) => l.Code === formState.Transfer_from_Code,
      );
      const toLoc = locations.find(
        (l) => l.Code === formState.Transfer_to_Code,
      );

      const updates: Partial<TransferOrder> = {};

      if (fromLoc?.Name && fromLoc.Name !== formState.Transfer_from_Name) {
        updates.Transfer_from_Name = fromLoc.Name;
      }
      if (toLoc?.Name && toLoc.Name !== formState.Transfer_to_Name) {
        updates.Transfer_to_Name = toLoc.Name;
      }

      // Auto-populate LOB and Branch from user setup based on Transfer From location
      if (
        formState.Transfer_from_Code &&
        userSetup.length > 0 &&
        !formState.No
      ) {
        const setupEntry = userSetup.find(
          (s) => s.LOC_Code === formState.Transfer_from_Code,
        );
        if (setupEntry) {
          if (
            setupEntry.LOB &&
            setupEntry.LOB !== formState.Shortcut_Dimension_1_Code
          ) {
            updates.Shortcut_Dimension_1_Code = setupEntry.LOB;
          }
          if (
            setupEntry.Branch_Code &&
            setupEntry.Branch_Code !== formState.Shortcut_Dimension_2_Code
          ) {
            updates.Shortcut_Dimension_2_Code = setupEntry.Branch_Code;
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        setFormState((prev) => ({ ...prev, ...updates }));
      }
    }
  }, [
    locations,
    formState.Transfer_from_Code,
    formState.Transfer_to_Code,
    userSetup,
    formState.No,
    formState.Shortcut_Dimension_1_Code,
    formState.Shortcut_Dimension_2_Code,
    formState.Transfer_from_Name,
    formState.Transfer_to_Name,
  ]);

  // Load Dimensions and Locations on mount
  useEffect(() => {
    const loadInitialData = async () => {
      if (!userId) return;

      setIsLoadingDimensions(true);
      try {
        // First get the user's authorized locations/dimension setup
        let [lobData, authLOCEntries] = await Promise.all([
          getLOBsFromUserSetup(userId),
          getAllLOCsFromUserSetup(userId),
        ]);

        // Rule 1: Transfer-from comes ONLY from authorized setup codes (fetch names from LocationList)
        const authCodes = authLOCEntries.map(l => l.Code).filter(Boolean);
        const fromLocations = authCodes.length > 0 
          ? await getAllLocationCodes(authCodes)
          : [];

        // Rule 2: Transfer-to fetches ALL locations without boundation
        const toLocations = await getAllLocationCodes();

        // Fallback to general LOBs if user setup doesn't exist
        if (lobData.length === 0) {
          console.log(
            "No LOBs in user setup, falling back to general LOB list",
          );
          lobData = await getLOBs();
        }

        setLobs(lobData);
        setLocations(fromLocations);
        setAllLocations(toLocations);

        // Load initial transporters
        const vendorData = await getTransporters();
        setTransporters(vendorData);

        // Auto-select LOB if only one exists and not currently set (only for new orders)
        if (
          !formState.No &&
          lobData.length === 1 &&
          !formState.Shortcut_Dimension_1_Code
        ) {
          setFormState((prev) => ({
            ...prev,
            Shortcut_Dimension_1_Code: lobData[0].Code,
          }));
        }
      } catch (error: any) {
        console.error("Error loading initial data detail:", error);
      } finally {
        setIsLoadingDimensions(false);
      }
    };

    loadInitialData();
  }, [userId]);

  // Load Branches when LOB changes
  useEffect(() => {
    const loadBranches = async () => {
      if (!userId || !formState.Shortcut_Dimension_1_Code) {
        setBranches([]);
        return;
      }

      try {
        let branchData = await getBranchesFromUserSetup(
          formState.Shortcut_Dimension_1_Code,
          userId,
        );

        // Fallback to general Branches if user setup doesn't exist
        if (branchData.length === 0) {
          console.log(
            "No Branches in user setup, falling back to general Branch list",
          );
          branchData = await getBranches();
        }

        setBranches(branchData);

        // Auto-select Branch if only one exists and not currently set (only for new orders)
        if (
          !formState.No &&
          branchData.length === 1 &&
          !formState.Shortcut_Dimension_2_Code
        ) {
          setFormState((prev) => ({
            ...prev,
            Shortcut_Dimension_2_Code: branchData[0].Code,
          }));
        }
      } catch (error) {
        console.error("Error loading branches:", error);
      }
    };

    loadBranches();
  }, [userId, formState.Shortcut_Dimension_1_Code]);

  const handleChange = (field: string, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    updateTab({ isSaved: false });
  };

  const handleCreateHeader = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formState.Transfer_from_Code || !formState.Transfer_to_Code) {
      toast.error("Please fill in all mandatory fields (Transfer From and To)");
      return;
    }

    setIsSubmitting(true);
    try {
      // Only send fields specifically requested for initial creation
      const payload: Partial<TransferOrder> = {
        Transfer_from_Code: formState.Transfer_from_Code,
        Transfer_to_Code: formState.Transfer_to_Code,
        Transporter_Code: formState.Transporter_Code,
        Transporter_Name: formState.Transporter_Name,
      };

      // Clean empty strings
      Object.keys(payload).forEach((key) => {
        if ((payload as any)[key] === "") {
          delete (payload as any)[key];
        }
      });

      console.log("Creating transfer order header with payload:", payload);

      const response = await createTransferOrder(payload);
      toast.success(`Transfer Order ${response.No} created successfully`);

      // Update local state to newly created order
      setFormState(response);
      setOriginalState(response);
      setLocalMode("edit");

      // Notify parent
      if (context?.onOrderCreated) {
        context.onOrderCreated(response);
      }

      updateTab({
        title: `Order ${response.No}`,
        isSaved: true,
      });
    } catch (error: any) {
      console.error("Error creating transfer order:", error);
      const errorMessage = error?.message || "Failed to create transfer order";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateHeader = async () => {
    if (!formState.No) return;

    // Calculate diff for allowed fields only
    const allowedToUpdate = [
      "Transporter_Code",
      "Transporter_Name",
      "External_Document_No",
      "Posting_Date",
      "Vehicle_No",
      "LR_RR_No",
      "LR_RR_Date",
      "Distance_Km",
      "Freight_Value",
      "Transfer_from_Code",
      "Transfer_to_Code",
      "Shortcut_Dimension_1_Code",
      "Shortcut_Dimension_2_Code",
      "In_Transit_Code",
      "Assigned_User_ID",
      "Shipment_Date",
      "Receipt_Date",
      "Shipping_Advice",
    ];

    const diff: Partial<TransferOrder> = {};
    allowedToUpdate.forEach((k) => {
      const key = k as keyof TransferOrder;
      if (formState[key] !== originalState[key]) {
        (diff as any)[key] = formState[key] || "";
      }
    });

    if (Object.keys(diff).length === 0) {
      toast.info("No changes to update");
      return;
    }

    setIsSubmitting(true);
    try {
      await patchTransferOrder(formState.No, diff);
      toast.success("Transfer Order updated");
      updateTab({ isSaved: true });
      fetchOrderData(formState.No);
    } catch (error: any) {
      console.error("Error updating transfer order:", error);
      toast.error(error.message || "Failed to update transfer order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLine = async (line: TransferLine) => {
    if (!formState.No) return;
    if (!confirm("Are you sure you want to delete this line?")) return;

    try {
      await deleteTransferLine(formState.No, line.Line_No);
      toast.success("Line deleted");
      const updatedLines = await getTransferOrderLines(formState.No);
      setLines(updatedLines);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete line");
    }
  };

  const handlePost = async () => {
    if (!formState.No) return;

    setIsSubmitting(true);
    try {
    // First, save any header changes before posting
    const allowedToUpdate = [
      "Transporter_Code",
      "Transporter_Name",
      "External_Document_No",
      "Posting_Date",
      "Vehicle_No",
      "LR_RR_No",
      "LR_RR_Date",
      "Distance_Km",
      "Freight_Value",
    ];

    const diff: Partial<TransferOrder> = {};
    allowedToUpdate.forEach((k) => {
      const key = k as keyof TransferOrder;
      if (formState[key] !== originalState[key]) {
        (diff as any)[key] = formState[key] || (typeof formState[key] === 'number' ? 0 : "");
      }
    });


    if (Object.keys(diff).length > 0) {
      await patchTransferOrder(formState.No, diff);
      console.log("Header updated before posting:", diff);
    }

    await postTransferOrder({
      docNo: formState.No,
      postShipment: postSelection === "ship" ? "True" : "False",
      postReceipt: postSelection === "receive" ? "True" : "False",
    });

    toast.success("Transfer Order posted successfully");
    setIsPostDialogOpen(false);
    handleSuccess();
  } catch (error: any) {
    console.error("Error posting transfer order:", error);
    toast.error(error.message || "Failed to post transfer order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopen = async () => {
    if (!formState.No) return;
    
    setIsSubmitting(true);
    try {
      await reopenTransferOrder(formState.No);
      toast.success("Transfer Order reopened successfully");
      fetchOrderData(formState.No);
    } catch (error: any) {
      console.error("Error reopening transfer order:", error);
      toast.error(error.message || "Failed to reopen transfer order");
    } finally {
      setIsSubmitting(false);
    }
  };



  const fieldClass = "min-w-0 space-y-1 text-left";
  const labelClass = "text-muted-foreground block text-xs font-medium";

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 p-12">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-muted-foreground animate-pulse font-medium">
          Loading transfer order...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-background flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
        <div className="w-full space-y-4">

          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-xl font-bold tracking-tight">
              New Transfer Order
            </h2>
            <div className="flex items-center gap-4">
              {formState.No && (
                <span className="bg-primary/10 text-primary border-primary/20 rounded-full border px-3 py-1 text-sm font-bold">
                  # {formState.No}
                </span>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuccess()}
                  type="button"
                >
                  Close
                </Button>
                {(formState.Status === "Released" || formState.Status === "Open") && formState.No && (
                  <Button
                    onClick={() => setIsPostDialogOpen(true)}
                    variant="default"
                    size="sm"
                    className="bg-green-600 font-bold text-white shadow-md transition-all hover:scale-105 hover:bg-green-700 active:scale-95"
                  >
                    Post
                  </Button>
                )}
                {formState.Status === "Released" && formState.No && (
                  <Button
                    onClick={handleReopen}
                    variant="outline"
                    size="sm"
                    className="border-primary text-primary hover:bg-primary/10 font-bold transition-all hover:scale-105 active:scale-95"
                  >
                    Reopen
                  </Button>
                )}

                {!formState.No ? (
                  <Button
                    onClick={handleCreateHeader}
                    size="sm"
                    disabled={isSubmitting}
                    className="shadow-primary/20 font-bold shadow-lg transition-all hover:scale-105 active:scale-95"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Transfer Order"
                    )}
                  </Button>
                ) : (
                  formState.Status !== "Released" && (
                    <Button
                      onClick={handleUpdateHeader}
                      variant="default"
                      size="sm"
                      disabled={isSubmitting}
                      className="font-bold shadow-md transition-all hover:scale-105 active:scale-95"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Header"
                      )}
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>

          <div className={cn("space-y-6", formState.No && "opacity-90")}>
            {/* 1. Transfer Locations (Moved to Top) */}
            <section className="space-y-1">
              <h3 className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                Transfer Locations
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

                <div className={fieldClass}>
                  <label className={labelClass}>
                    Transfer-from Code (Required)
                  </label>
                  <SearchableSelect
                    options={locations.map((l) => ({
                      value: l.Code,
                      label: `${l.Code} - ${l.Name || ""}`,
                    }))}
                    value={formState.Transfer_from_Code}
                    onValueChange={(v) => {
                      const loc = locations.find((l) => l.Code === v);
                      setFormState((prev) => ({
                        ...prev,
                        Transfer_from_Code: v,
                        Transfer_from_Name: loc?.Name || "",
                      }));
                      updateTab({ isSaved: false });
                    }}
                    placeholder="Select Source Location"
                    disabled={formState.Status === "Released"}
                  />
                  {formState.Transfer_from_Name && (
                    <p className="text-primary mt-1 truncate pl-1 text-[10px] font-medium">
                      {formState.Transfer_from_Name}
                    </p>
                  )}
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>
                    Transfer-to Code (Required)
                  </label>
                  <SearchableSelect
                    options={allLocations.map((l) => ({
                      value: l.Code,
                      label: l.Name ? `${l.Code} - ${l.Name}` : l.Code,
                    }))}
                    value={formState.Transfer_to_Code}
                    onValueChange={(v) => {
                      const loc = allLocations.find((l) => l.Code === v);
                      setFormState((prev) => ({
                        ...prev,
                        Transfer_to_Code: v,
                        Transfer_to_Name: loc?.Name || "",
                      }));
                      updateTab({ isSaved: false });
                    }}
                    onSearch={async (q) => {
                      if (q.length >= 2) {
                        const results = await getLocationCodes(q); // Pass NO authorizedLOCs for unbound search
                        setAllLocations((prev) => {
                          const combined = [...prev, ...results];
                          const unique = new Map();
                          combined.forEach((l) => unique.set(l.Code, l));
                          return Array.from(unique.values());
                        });
                      }
                    }}
                    placeholder="Select Destination Location"
                    disabled={formState.Status === "Released"}
                  />
                  {formState.Transfer_to_Name && (
                    <p className="text-primary mt-1 truncate pl-1 text-[10px] font-medium">
                      {formState.Transfer_to_Name}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* 2. Header Details */}
            <section className="space-y-1">
              <h3 className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                Order Details
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">

                <div className={fieldClass}>
                  <label className={labelClass}>No.</label>
                  <Input
                    value={formState.No}
                    readOnly
                    disabled
                    className="bg-muted h-8"
                    placeholder="Auto-generated"
                  />
                </div>

                <div className={fieldClass}>
                  <label className={labelClass}>Posting Date</label>
                  <Input
                    type="date"
                    value={
                      formState.Posting_Date
                        ? formState.Posting_Date.split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      handleChange("Posting_Date", e.target.value)
                    }
                    disabled={formState.Status === "Released"}
                    className="h-8"
                  />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>External Document No.</label>
                  <Input
                    value={formState.External_Document_No || ""}
                    onChange={(e) =>
                      handleChange("External_Document_No", e.target.value)
                    }
                    disabled={formState.Status === "Released"}
                    className="h-8"
                  />
                </div>
              </div>
            </section>

            {/* 2. Dimensions */}
            <section className="space-y-1">
              <h3 className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                Dimensions
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">

                <div className={fieldClass}>
                  <label className={labelClass}>LOB</label>
                  <Input
                    value={formState.Shortcut_Dimension_1_Code || ""}
                    readOnly
                    disabled
                    className="bg-muted h-8"
                  />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Branch</label>
                  <Input
                    value={formState.Shortcut_Dimension_2_Code || ""}
                    readOnly
                    disabled
                    className="bg-muted h-8"
                  />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>In-Transit Code</label>
                  <Input
                    value={formState.In_Transit_Code}
                    readOnly
                    disabled
                    className="bg-muted h-8"
                  />
                </div>
              </div>
            </section>

            {/* 4. Transport & Logistics */}
            <section className="space-y-1">
              <h3 className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                Transport & Logistics
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">

                <div className={fieldClass}>
                  <label className={labelClass}>Vehicle No.</label>
                  <Input
                    value={formState.Vehicle_No || ""}
                    onChange={(e) => handleChange("Vehicle_No", e.target.value)}
                    disabled={formState.Status === "Released"}
                    className="h-8"
                  />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>LR/RR No.</label>
                  <Input
                    value={formState.LR_RR_No || ""}
                    onChange={(e) => handleChange("LR_RR_No", e.target.value)}
                    disabled={formState.Status === "Released"}
                    className="h-8"
                  />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>LR/RR Date</label>
                  <Input
                    type="date"
                    value={
                      formState.LR_RR_Date
                        ? formState.LR_RR_Date.split("T")[0]
                        : ""
                    }
                    onChange={(e) => handleChange("LR_RR_Date", e.target.value)}
                    disabled={formState.Status === "Released"}
                    className="h-8"
                  />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Mode of Transport</label>
                  <Input
                    value={formState.Mode_of_Transport || ""}
                    readOnly
                    disabled
                    className="bg-muted h-8"
                  />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Distance (Km)</label>
                  <Input
                    type="number"
                    value={formState.Distance_Km || 0}
                    onChange={(e) =>
                      handleChange(
                        "Distance_Km",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    disabled={formState.Status === "Released"}
                    className="h-8"
                  />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Freight Value</label>
                  <Input
                    type="number"
                    value={formState.Freight_Value || 0}
                    onChange={(e) =>
                      handleChange(
                        "Freight_Value",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    disabled={formState.Status === "Released"}
                    className="h-8"
                  />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>
                    Transporter Code (Optional)
                  </label>
                  <SearchableSelect
                    options={transporters.map((v) => ({
                      value: v.No,
                      label: `${v.No} - ${v.Name}`,
                    }))}
                    value={formState.Transporter_Code || ""}
                    onValueChange={(v) => {
                      const vendor = transporters.find((t) => t.No === v);
                      setFormState((prev) => ({
                        ...prev,
                        Transporter_Code: v,
                        Transporter_Name: vendor?.Name || "",
                      }));
                      updateTab({ isSaved: false });
                    }}
                    onSearch={async (q) => {
                      if (q.length >= 2) {
                        const results = await searchTransporters(q);
                        setTransporters((prev) => {
                          const combined = [...prev, ...results];
                          const unique = new Map();
                          combined.forEach((v) => unique.set(v.No, v));
                          return Array.from(unique.values());
                        });
                      }
                    }}
                    placeholder="Select Transporter"
                    disabled={formState.Status === "Released"}
                  />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>
                    Transporter Name (Optional)
                  </label>
                  <Input
                    value={formState.Transporter_Name || ""}
                    onChange={(e) =>
                      handleChange("Transporter_Name", e.target.value)
                    }
                    disabled={formState.Status === "Released" || !!formState.Transporter_Code}
                    className={cn("h-8", !!formState.Transporter_Code && "bg-muted")}
                    placeholder="Enter Name"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>


        {formState.No && (
          <section className="animate-in fade-in slide-in-from-bottom-4 mt-8 space-y-4 border-t pt-6 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Line Items</h2>
                <p className="text-muted-foreground text-left text-sm">
                  Manage products in this transfer
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchOrderData(formState.No!)}
                  disabled={isLoadingLines}
                  className="h-9 px-3"
                >
                  <RefreshCw
                    className={cn(
                      "mr-2 h-4 w-4",
                      isLoadingLines && "animate-spin",
                    )}
                  />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedLine(null);
                    setIsLineDialogOpen(true);
                  }}
                  className="h-9 px-3"
                  disabled={formState.Status === "Released"}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </div>
            </div>

            <TransferOrderLinesTable
              lines={lines}
              isLoading={isLoadingLines}
              onEdit={(line) => {
                setSelectedLine(line);
                setIsLineDialogOpen(true);
              }}
              onDelete={handleDeleteLine}
              onRowClick={(line) => {
                setSelectedLine(line);
                setIsDetailsDialogOpen(true);
              }}
              isReadOnly={formState.Status === "Released"}
            />
          </section>
        )}
      </div>

      <div className="bg-muted/20 sticky bottom-0 z-10 flex items-center justify-between border-t p-4 px-6 backdrop-blur-md">
        <div className="text-muted-foreground text-xs">
          {formState.No
            ? `Editing order ${formState.No}`
            : "Create the header first to enable line items."}
        </div>
        <div className="flex gap-3">
          {formState.No && (
            <Button
              variant="default"
              onClick={() => handleSuccess()}
              className="px-8"
            >
              Done
            </Button>
          )}
        </div>
      </div>

      <TransferOrderLineDialog
        isOpen={isLineDialogOpen}
        onOpenChange={setIsLineDialogOpen}
        documentNo={formState.No || ""}
        line={selectedLine}
        onSuccess={() => fetchOrderData(formState.No!)}
        locationCode={formState.Transfer_from_Code || ""}
        defaultDimensions={{
          Shortcut_Dimension_1_Code: formState.Shortcut_Dimension_1_Code || "",
          Shortcut_Dimension_2_Code: formState.Shortcut_Dimension_2_Code || "",
          In_Transit_Code: formState.In_Transit_Code || "",
          Shipment_Date: formState.Shipment_Date || "",
          Receipt_Date: formState.Receipt_Date || "",
        }}
      />

      {selectedLine && (
        <TransferOrderLineDetailsDialog
          isOpen={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
          line={selectedLine}
          locationCode={formState.Transfer_from_Code}
          onSuccess={() => fetchOrderData(formState.No!)}
        />
      )}

      {/* Post Dialog */}
      <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Post Transfer Order</DialogTitle>
            <DialogDescription>
              Review order details and choose how you want to post.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Post Options */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className={cn(
                  "flex cursor-pointer items-center space-x-3 rounded-lg border p-3 transition-colors",
                  postSelection === "ship"
                    ? "border-primary bg-primary/10"
                    : "hover:bg-muted",
                )}
                onClick={() => setPostSelection("ship")}
              >
                <div
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border",
                    postSelection === "ship"
                      ? "border-primary"
                      : "border-muted-foreground",
                  )}
                >
                  {postSelection === "ship" && (
                    <div className="bg-primary h-2 w-2 rounded-full" />
                  )}
                </div>
                <span className="text-sm font-medium">Shipment</span>
              </div>

              <div
                className={cn(
                  "flex cursor-pointer items-center space-x-3 rounded-lg border p-3 transition-colors",
                  postSelection === "receive"
                    ? "border-primary bg-primary/10"
                    : "hover:bg-muted",
                )}
                onClick={() => setPostSelection("receive")}
              >
                <div
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border",
                    postSelection === "receive"
                      ? "border-primary"
                      : "border-muted-foreground",
                  )}
                >
                  {postSelection === "receive" && (
                    <div className="bg-primary h-2 w-2 rounded-full" />
                  )}
                </div>
                <span className="text-sm font-medium">Receipt</span>
              </div>
            </div>

            {/* Additional Fields Form */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-4">
              <div className="space-y-1">
                <label className="text-muted-foreground text-xs font-medium">Posting Date</label>
                <Input
                  type="date"
                  value={formState.Posting_Date ? formState.Posting_Date.split("T")[0] : ""}
                  onChange={(e) => handleChange("Posting_Date", e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-xs font-medium">External Document No.</label>
                <Input
                  value={formState.External_Document_No || ""}
                  onChange={(e) => handleChange("External_Document_No", e.target.value)}
                  className="h-9"
                  placeholder="Enter External Doc No"
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-xs font-medium">Vehicle No.</label>
                <Input
                  value={formState.Vehicle_No || ""}
                  onChange={(e) => handleChange("Vehicle_No", e.target.value)}
                  className="h-9"
                  placeholder="Enter Vehicle No"
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-xs font-medium">LR/RR No.</label>
                <Input
                  value={formState.LR_RR_No || ""}
                  onChange={(e) => handleChange("LR_RR_No", e.target.value)}
                  className="h-9"
                  placeholder="Enter LR/RR No"
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-xs font-medium">LR/RR Date</label>
                <Input
                  type="date"
                  value={formState.LR_RR_Date ? formState.LR_RR_Date.split("T")[0] : ""}
                  onChange={(e) => handleChange("LR_RR_Date", e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-xs font-medium">Distance (Km)</label>
                <Input
                  type="number"
                  value={formState.Distance_Km || 0}
                  onChange={(e) => handleChange("Distance_Km", parseFloat(e.target.value) || 0)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-xs font-medium">Freight Value</label>
                <Input
                  type="number"
                  value={formState.Freight_Value || 0}
                  onChange={(e) => handleChange("Freight_Value", parseFloat(e.target.value) || 0)}
                  className="h-9"
                />
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-muted-foreground text-xs font-medium">Transporter</label>
                  <SearchableSelect
                    options={transporters.map((v) => ({
                      value: v.No,
                      label: `${v.No} - ${v.Name}`,
                    }))}
                    value={formState.Transporter_Code || ""}
                    onValueChange={(v) => {
                      const vendor = transporters.find((t) => t.No === v);
                      setFormState((prev) => ({
                        ...prev,
                        Transporter_Code: v,
                        Transporter_Name: vendor?.Name || "",
                      }));
                      updateTab({ isSaved: false });
                    }}
                    onSearch={async (q) => {
                      if (q.length >= 2) {
                        const results = await searchTransporters(q);
                        setTransporters((prev) => {
                          const combined = [...prev, ...results];
                          const unique = new Map();
                          combined.forEach((v) => unique.set(v.No, v));
                          return Array.from(unique.values());
                        });
                      }
                    }}
                    placeholder="Select Transporter"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground text-xs font-medium">Transporter Name</label>
                  <Input
                    value={formState.Transporter_Name || ""}
                    onChange={(e) => handleChange("Transporter_Name", e.target.value)}
                    className={cn("h-9", !!formState.Transporter_Code && "bg-muted")}
                    disabled={!!formState.Transporter_Code}
                    placeholder="Enter Name"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPostDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePost}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
