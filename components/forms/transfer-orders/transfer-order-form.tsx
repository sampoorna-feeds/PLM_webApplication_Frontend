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
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { getAuthCredentials } from "@/lib/auth/storage";
import {
  getLOBsFromUserSetup,
  getBranchesFromUserSetup,
  getLOBs,
  getBranches,
  type DimensionValue,
} from "@/lib/api/services/dimension.service";
import {
  getAllLocationCodes,
  type LocationCode,
} from "@/lib/api/services/production-order-data.service";
import {
  createTransferOrder,
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
    Transfer_from_Code: "",
    Transfer_to_Code: "",
    In_Transit_Code: "IN-TRANSIT",
    Status: "Open",
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

  // Get logged-in user ID
  useEffect(() => {
    const credentials = getAuthCredentials();
    if (credentials) {
      setUserId(credentials.userID);
      if (!isViewMode) {
        setFormState((prev) => ({ ...prev, Assigned_User_ID: credentials.userID }));
      }
    }
  }, [isViewMode]);

  // Load Order Data and Lines if orderNo exists
  const fetchOrderData = useCallback(async (no: string) => {
    setIsLoading(true);
    try {
      const order = await getTransferOrderByNo(no);
      if (order) {
        setFormState(order);
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

  // Load LOBs and Locations on mount
  useEffect(() => {
    const loadInitialData = async () => {
      // Need user ID for LOBs
      let currentUserId = userId;
      if (!currentUserId) {
        const credentials = getAuthCredentials();
        currentUserId = credentials?.userID;
      }
      
      if (!currentUserId) return;

      setIsLoadingDimensions(true);
      try {
        let [lobData, locationData] = await Promise.all([
          getLOBsFromUserSetup(currentUserId),
          getAllLocationCodes(),
        ]);
        
        // Fallback to general LOBs if user setup doesn't exist
        if (lobData.length === 0) {
          console.log("No LOBs in user setup, falling back to general LOB list");
          lobData = await getLOBs();
        }

        setLobs(lobData);
        setLocations(locationData);
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
      let currentUserId = userId;
      if (!currentUserId) {
        const credentials = getAuthCredentials();
        currentUserId = credentials?.userID;
      }

      if (!currentUserId || !formState.Shortcut_Dimension_1_Code) {
        setBranches([]);
        return;
      }

      try {
        let branchData = await getBranchesFromUserSetup(
          formState.Shortcut_Dimension_1_Code,
          currentUserId,
        );

        // Fallback to general Branches if user setup doesn't exist
        if (branchData.length === 0) {
          console.log("No Branches in user setup, falling back to general Branch list");
          branchData = await getBranches();
        }

        setBranches(branchData);
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
    
    if (!formState.Transfer_from_Code || !formState.Transfer_to_Code || !formState.Shortcut_Dimension_1_Code || !formState.Shortcut_Dimension_2_Code) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Sanitize data - remove empty strings and internal fields
      const payload = { ...formState };
      if (!payload.No) delete payload.No;
      
      // Remove any fields that are empty strings but might be expected to be null or omitted
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
      console.error("Error creating transfer order detail:", {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        details: error?.details,
        raw: error
      });
      const errorMessage = error?.message || "Failed to create transfer order";
      toast.error(errorMessage);
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading order details...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">General Information</h2>
            {formState.No && (
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold border border-primary/20">
                # {formState.No}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Dimensions */}
            <div className="space-y-4 border p-5 rounded-xl bg-muted/5 shadow-sm">
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Dimensions
              </h3>
              
              <div className="space-y-2">
                <FieldTitle required>LOB (Dimension 1)</FieldTitle>
                <Select
                  value={formState.Shortcut_Dimension_1_Code}
                  onValueChange={(v) => handleChange("Shortcut_Dimension_1_Code", v)}
                  disabled={!!formState.No}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select LOB" />
                  </SelectTrigger>
                  <SelectContent>
                    {lobs.map((lob) => (
                      <SelectItem key={lob.Code} value={lob.Code}>
                        {lob.Code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <FieldTitle required>Branch (Dimension 2)</FieldTitle>
                <Select
                  value={formState.Shortcut_Dimension_2_Code}
                  onValueChange={(v) => handleChange("Shortcut_Dimension_2_Code", v)}
                  disabled={!formState.Shortcut_Dimension_1_Code || !!formState.No}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.Code} value={branch.Code}>
                        {branch.Code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Transfer Info */}
            <div className="space-y-4 border p-5 rounded-xl bg-muted/5 shadow-sm">
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Transfer Details
              </h3>
              
              <div className="space-y-2">
                <FieldTitle required>Transfer From</FieldTitle>
                <SearchableSelect
                  options={locations.map(l => ({ value: l.Code, label: `${l.Code} - ${l.Name || ""}` }))}
                  value={formState.Transfer_from_Code}
                  onValueChange={(v) => handleChange("Transfer_from_Code", v)}
                  placeholder="Select Source Location"
                  disabled={!!formState.No}
                />
              </div>

              <div className="space-y-2">
                <FieldTitle required>Transfer To</FieldTitle>
                <SearchableSelect
                  options={locations.map(l => ({ value: l.Code, label: `${l.Code} - ${l.Name || ""}` }))}
                  value={formState.Transfer_to_Code}
                  onValueChange={(v) => handleChange("Transfer_to_Code", v)}
                  placeholder="Select Destination Location"
                  disabled={!!formState.No}
                />
              </div>

              <div className="space-y-2">
                <FieldTitle>In Transit Code</FieldTitle>
                <Input
                  value={formState.In_Transit_Code}
                  onChange={(e) => handleChange("In_Transit_Code", e.target.value)}
                  disabled={!!formState.No}
                  className="bg-background"
                />
              </div>
            </div>

            {/* Dates & Status */}
            <div className="space-y-4 border p-5 rounded-xl bg-muted/5 shadow-sm">
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Dates & Shipping
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldTitle>Shipment Date</FieldTitle>
                  <Input
                    type="date"
                    value={formState.Shipment_Date ? formState.Shipment_Date.split("T")[0] : ""}
                    onChange={(e) => handleChange("Shipment_Date", e.target.value)}
                    disabled={!!formState.No}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <FieldTitle>Receipt Date</FieldTitle>
                  <Input
                    type="date"
                    value={formState.Receipt_Date ? formState.Receipt_Date.split("T")[0] : ""}
                    onChange={(e) => handleChange("Receipt_Date", e.target.value)}
                    disabled={!!formState.No}
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FieldTitle>Shipping Advice</FieldTitle>
                <Select
                  value={formState.Shipping_Advice}
                  onValueChange={(v) => handleChange("Shipping_Advice", v)}
                  disabled={!!formState.No}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Partial">Partial</SelectItem>
                    <SelectItem value="Complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* System Info */}
            <div className="space-y-4 border p-5 rounded-xl bg-muted/5 shadow-sm">
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Tracking Info
              </h3>
              
              <div className="space-y-2">
                <FieldTitle>Status</FieldTitle>
                <div className="bg-muted px-3 py-2 rounded-md text-sm font-medium border">
                  {formState.Status || "Open"}
                </div>
              </div>

              <div className="space-y-2">
                <FieldTitle>Assigned User ID</FieldTitle>
                <Input
                  value={formState.Assigned_User_ID}
                  onChange={(e) => handleChange("Assigned_User_ID", e.target.value)}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>
          </div>

          {!formState.No && (
            <div className="flex justify-end pt-4">
              <Button onClick={handleCreateHeader} size="lg" disabled={isSubmitting} className="px-8 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Header...
                  </>
                ) : (
                  "Initiate Transfer Order"
                )}
              </Button>
            </div>
          )}
        </section>

        {formState.No && (
          <section className="space-y-4 pt-4 border-t animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Line Items</h2>
                <p className="text-sm text-muted-foreground">Manage products in this transfer</p>
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
          {formState.No ? `Editing order ${formState.No}` : "New Transfer Order Entry"}
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => handleSuccess()} type="button">
            Close
          </Button>
          {formState.No && (
             <Button variant="default" onClick={() => handleSuccess()}>
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
