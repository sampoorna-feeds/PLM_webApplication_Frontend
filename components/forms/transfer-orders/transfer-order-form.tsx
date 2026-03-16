import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldTitle } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SearchableSelect,
} from "@/components/ui/searchable-select";
import { ClearableField } from "@/components/ui/clearable-field";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { getAuthCredentials } from "@/lib/auth/storage";
import {
  getLOBsFromUserSetup,
  getBranchesFromUserSetup,
  getWebUserSetup,
  getLOBs,
  getBranches,
  type DimensionValue,
  type WebUserSetup,
} from "@/lib/api/services/dimension.service";
import {
  getAllLocationCodes,
  type LocationCode,
} from "@/lib/api/services/production-order-data.service";
import {
  createTransferOrder,
  patchTransferOrder,
  getTransferOrderByNo,
  getTransferOrderLines,
  deleteTransferLine,
  type TransferOrder,
  type TransferLine,
} from "@/lib/api/services/transfer-orders.service";
import { TransferOrderLinesTable } from "./transfer-order-lines-table";
import { TransferOrderLineDialog } from "./transfer-order-line-dialog";

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
    Transfer_From_Code: "",
    Transfer_From_Name: "",
    Transfer_To_Code: "",
    Transfer_To_Name: "",
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

  const [originalState, setOriginalState] = useState<Partial<TransferOrder>>({});

  // Lines state
  const [lines, setLines] = useState<TransferLine[]>([]);
  const [isLoadingLines, setIsLoadingLines] = useState(false);
  const [selectedLine, setSelectedLine] = useState<TransferLine | null>(null);
  const [isLineDialogOpen, setIsLineDialogOpen] = useState(false);

  // Dimension dropdowns state
  const [lobs, setLobs] = useState<DimensionValue[]>([]);
  const [branches, setBranches] = useState<DimensionValue[]>([]);
  const [locations, setLocations] = useState<LocationCode[]>([]);
  const [isLoadingDimensions, setIsLoadingDimensions] = useState(false);

  const [userSetup, setUserSetup] = useState<WebUserSetup[]>([]);

  // Get logged-in user ID and setup
  useEffect(() => {
    const loadUserContext = async () => {
      const credentials = getAuthCredentials();
      if (credentials) {
        setUserId(credentials.userID);
        if (!isViewMode) {
          setFormState((prev) => ({ ...prev, Assigned_User_ID: credentials.userID }));
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

  // Resolve Location Names and auto-populate dimensions from setup when Transfer_From_Code changes
  useEffect(() => {
    if (locations.length > 0) {
      const fromLoc = locations.find(l => l.Code === formState.Transfer_From_Code);
      const toLoc = locations.find(l => l.Code === formState.Transfer_To_Code);
      
      const updates: Partial<TransferOrder> = {};
      
      if (fromLoc?.Name && fromLoc.Name !== formState.Transfer_From_Name) {
        updates.Transfer_From_Name = fromLoc.Name;
      }
      if (toLoc?.Name && toLoc.Name !== formState.Transfer_To_Name) {
        updates.Transfer_To_Name = toLoc.Name;
      }

      // Auto-populate LOB and Branch from user setup based on Transfer From location
      if (formState.Transfer_From_Code && userSetup.length > 0 && !formState.No) {
        const setupEntry = userSetup.find(s => s.LOC_Code === formState.Transfer_From_Code);
        if (setupEntry) {
          if (setupEntry.LOB && setupEntry.LOB !== formState.Shortcut_Dimension_1_Code) {
            updates.Shortcut_Dimension_1_Code = setupEntry.LOB;
          }
          if (setupEntry.Branch_Code && setupEntry.Branch_Code !== formState.Shortcut_Dimension_2_Code) {
            updates.Shortcut_Dimension_2_Code = setupEntry.Branch_Code;
          }
        }
      }
      
      if (Object.keys(updates).length > 0) {
        setFormState(prev => ({ ...prev, ...updates }));
      }
    }
  }, [locations, formState.Transfer_From_Code, formState.Transfer_To_Code, userSetup, formState.No, formState.Shortcut_Dimension_1_Code, formState.Shortcut_Dimension_2_Code, formState.Transfer_From_Name, formState.Transfer_To_Name]);

  // Load Dimensions and Locations on mount
  useEffect(() => {
    const loadInitialData = async () => {
      if (!userId) return;

      setIsLoadingDimensions(true);
      try {
        let [lobData, locationData] = await Promise.all([
          getLOBsFromUserSetup(userId),
          getAllLocationCodes(),
        ]);
        
        // Fallback to general LOBs if user setup doesn't exist
        if (lobData.length === 0) {
          console.log("No LOBs in user setup, falling back to general LOB list");
          lobData = await getLOBs();
        }

        setLobs(lobData);
        setLocations(locationData);
        
        // Auto-select LOB if only one exists and not currently set (only for new orders)
        if (!formState.No && lobData.length === 1 && !formState.Shortcut_Dimension_1_Code) {
          setFormState(prev => ({ ...prev, Shortcut_Dimension_1_Code: lobData[0].Code }));
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
          console.log("No Branches in user setup, falling back to general Branch list");
          branchData = await getBranches();
        }

        setBranches(branchData);
        
        // Auto-select Branch if only one exists and not currently set (only for new orders)
        if (!formState.No && branchData.length === 1 && !formState.Shortcut_Dimension_2_Code) {
          setFormState(prev => ({ ...prev, Shortcut_Dimension_2_Code: branchData[0].Code }));
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
    
    if (!formState.Transfer_From_Code || !formState.Transfer_To_Code) {
      toast.error("Please fill in all mandatory fields (Transfer From and To)");
      return;
    }

    setIsSubmitting(true);
    try {
      // Only send fields explicitly requested or required for system
      const payload: Partial<TransferOrder> = {
        Transfer_From_Code: formState.Transfer_From_Code,
        Transfer_To_Code: formState.Transfer_To_Code,
        Shortcut_Dimension_1_Code: formState.Shortcut_Dimension_1_Code,
        Shortcut_Dimension_2_Code: formState.Shortcut_Dimension_2_Code,
        In_Transit_Code: formState.In_Transit_Code,
        Assigned_User_ID: formState.Assigned_User_ID,
        Shipment_Date: formState.Shipment_Date,
        Receipt_Date: formState.Receipt_Date,
        Shipping_Advice: formState.Shipping_Advice,
        Transporter_Code: formState.Transporter_Code,
        Transporter_Name: formState.Transporter_Name,
        External_Document_No: formState.External_Document_No,
      };
      
      // Clean empty strings
      Object.keys(payload).forEach(key => {
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
        isSaved: true 
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
      "Transporter_Name"
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

  const fieldClass = "min-w-0 space-y-1 text-left";
  const labelClass = "text-muted-foreground block text-xs font-medium";

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Loading transfer order...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-xl font-bold tracking-tight">New Transfer Order</h2>
            <div className="flex items-center gap-4">
              {formState.No && (
                 <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold border border-primary/20">
                  # {formState.No}
                </span>
              )}
              <div className="flex gap-2">
                 <Button variant="outline" size="sm" onClick={() => handleSuccess()} type="button">
                    Close
                  </Button>
                  {!formState.No ? (
                    <Button onClick={handleCreateHeader} size="sm" disabled={isSubmitting} className="font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
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
                      <Button onClick={handleUpdateHeader} variant="default" size="sm" disabled={isSubmitting} className="font-bold shadow-md transition-all hover:scale-105 active:scale-95">
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

          <div className={cn("space-y-8", formState.No && "opacity-90")}>
            {/* 1. Header Details */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Order Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                <div className={fieldClass}>
                  <label className={labelClass}>No.</label>
                  <Input value={formState.No} readOnly disabled className="h-8 bg-muted" placeholder="Auto-generated" />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Status</label>
                  <Input value={formState.Status} readOnly disabled className="h-8 bg-muted" />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Posting Date</label>
                  <Input value={formState.Posting_Date ? formState.Posting_Date.split("T")[0] : ""} readOnly disabled className="h-8 bg-muted" />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>External Document No.</label>
                  <Input value={formState.External_Document_No || ""} readOnly disabled className="h-8 bg-muted" />
                </div>
              </div>
            </section>

            {/* 2. Dimensions */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dimensions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                <div className={fieldClass}>
                  <label className={labelClass}>LOB</label>
                  <Input value={formState.Shortcut_Dimension_1_Code || ""} readOnly disabled className="h-8 bg-muted" />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Branch</label>
                  <Input value={formState.Shortcut_Dimension_2_Code || ""} readOnly disabled className="h-8 bg-muted" />
                </div>
                <div className={fieldClass}>
                    <label className={labelClass}>In-Transit Code</label>
                    <Input
                      value={formState.In_Transit_Code}
                      readOnly
                      disabled
                      className="h-8 bg-muted"
                    />
                </div>
              </div>
            </section>

            {/* 3. Transfer Locations */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Transfer Locations</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div className={fieldClass}>
                  <label className={labelClass}>Transfer-from Code (Required)</label>
                  <SearchableSelect
                    options={locations.map(l => ({ value: l.Code, label: `${l.Code} - ${l.Name || ""}` }))}
                    value={formState.Transfer_From_Code}
                    onValueChange={(v) => {
                      const loc = locations.find(l => l.Code === v);
                      setFormState(prev => ({ ...prev, Transfer_From_Code: v, Transfer_From_Name: loc?.Name || "" }));
                      updateTab({ isSaved: false });
                    }}
                    placeholder="Select Source Location"
                    disabled={formState.Status === "Released" || !!formState.No}
                  />
                  {formState.Transfer_From_Name && (
                    <p className="mt-1 truncate pl-1 text-[10px] font-medium text-primary">
                      {formState.Transfer_From_Name}
                    </p>
                  )}
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Transfer-to Code (Required)</label>
                  <SearchableSelect
                    options={locations.map(l => ({ value: l.Code, label: `${l.Code} - ${l.Name || ""}` }))}
                    value={formState.Transfer_To_Code}
                    onValueChange={(v) => {
                      const loc = locations.find(l => l.Code === v);
                      setFormState(prev => ({ ...prev, Transfer_To_Code: v, Transfer_To_Name: loc?.Name || "" }));
                      updateTab({ isSaved: false });
                    }}
                    placeholder="Select Destination Location"
                    disabled={formState.Status === "Released" || !!formState.No}
                  />
                  {formState.Transfer_To_Name && (
                    <p className="mt-1 truncate pl-1 text-[10px] font-medium text-primary">
                      {formState.Transfer_To_Name}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* 4. Transport & Logistics */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Transport & Logistics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                <div className={fieldClass}>
                  <label className={labelClass}>Vehicle No.</label>
                  <Input value={formState.Vehicle_No || ""} readOnly disabled className="h-8 bg-muted" />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>LR/RR No.</label>
                  <Input value={formState.LR_RR_No || ""} readOnly disabled className="h-8 bg-muted" />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>LR/RR Date</label>
                  <Input value={formState.LR_RR_Date ? formState.LR_RR_Date.split("T")[0] : ""} readOnly disabled className="h-8 bg-muted" />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Mode of Transport</label>
                  <Input value={formState.Mode_of_Transport || ""} readOnly disabled className="h-8 bg-muted" />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Distance (Km)</label>
                  <Input value={formState.Distance_Km || 0} readOnly disabled className="h-8 bg-muted text-right" />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Freight Value</label>
                  <Input value={formState.Freight_Value || 0} readOnly disabled className="h-8 bg-muted text-right" />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Transporter Code (Optional)</label>
                  <Input 
                    value={formState.Transporter_Code || ""} 
                    onChange={(e) => handleChange("Transporter_Code", e.target.value)}
                    disabled={formState.Status === "Released"}
                    className="h-8" 
                    placeholder="Enter Code"
                  />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Transporter Name (Optional)</label>
                  <Input 
                    value={formState.Transporter_Name || ""} 
                    onChange={(e) => handleChange("Transporter_Name", e.target.value)}
                    disabled={formState.Status === "Released"}
                    className="h-8" 
                    placeholder="Enter Name"
                  />
                </div>
              </div>
            </section>
          </div>
        </section>

        {formState.No && (
          <section className="space-y-4 pt-6 mt-8 border-t animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Line Items</h2>
                <p className="text-sm text-muted-foreground text-left">Manage products in this transfer</p>
              </div>
              <div className="flex gap-2">
                 <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchOrderData(formState.No!)} 
                  disabled={isLoadingLines}
                  className="h-9 px-3"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", isLoadingLines && "animate-spin")} />
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
                  <Plus className="h-4 w-4 mr-2" />
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
              isReadOnly={formState.Status === "Released"}
            />
          </section>
        )}
      </div>

      <div className="border-t p-4 px-6 flex justify-between items-center bg-muted/20 backdrop-blur-md sticky bottom-0 z-10">
        <div className="text-xs text-muted-foreground">
          {formState.No ? `Editing order ${formState.No}` : "Create the header first to enable line items."}
        </div>
        <div className="flex gap-3">
          {formState.No && (
             <Button variant="default" onClick={() => handleSuccess()} className="px-8">
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
        onSuccess={async () => {
          if (formState.No) {
            const updatedLines = await getTransferOrderLines(formState.No);
            setLines(updatedLines);
          }
        }}
        defaultDimensions={{
          Shortcut_Dimension_1_Code: formState.Shortcut_Dimension_1_Code || "",
          Shortcut_Dimension_2_Code: formState.Shortcut_Dimension_2_Code || "",
          In_Transit_Code: formState.In_Transit_Code || "",
          Shipment_Date: formState.Shipment_Date || "",
          Receipt_Date: formState.Receipt_Date || "",
        }}
      />
    </div>
  );
}
