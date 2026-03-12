"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldTitle } from "@/components/ui/field";
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
  type DimensionValue,
} from "@/lib/api/services/dimension.service";
import {
  getAllLocationCodes,
  type LocationCode,
} from "@/lib/api/services/production-order-data.service";
import {
  createTransferOrder,
  type TransferOrder,
} from "@/lib/api/services/transfer-orders.service";

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
  const { handleSuccess, updateTab } = useFormStack(tabId);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formState, setFormState] = useState({
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
      setFormState((prev) => ({ ...prev, Assigned_User_ID: credentials.userID }));
    }
  }, []);

  // Load LOBs and Locations on mount
  useEffect(() => {
    if (!userId) return;

    const loadInitialData = async () => {
      setIsLoadingDimensions(true);
      try {
        const [lobData, locationData] = await Promise.all([
          getLOBsFromUserSetup(userId),
          getAllLocationCodes(),
        ]);
        setLobs(lobData);
        setLocations(locationData);
      } catch (error) {
        console.error("Error loading initial data:", error);
        toast.error("Failed to load dimensions/locations");
      } finally {
        setIsLoadingDimensions(false);
      }
    };

    loadInitialData();
  }, [userId]);

  // Load Branches when LOB changes
  useEffect(() => {
    if (!userId || !formState.Shortcut_Dimension_1_Code) {
      setBranches([]);
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
  }, [userId, formState.Shortcut_Dimension_1_Code]);

  const handleChange = (field: string, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    updateTab({ isSaved: false });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formState.Transfer_from_Code || !formState.Transfer_to_Code || !formState.Shortcut_Dimension_1_Code || !formState.Shortcut_Dimension_2_Code) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createTransferOrder(formState);
      toast.success(`Transfer Order ${response.No} created successfully`);
      
      // Update tab state or close
      if (context?.onOrderCreated) {
        context.onOrderCreated(response);
      }
      handleSuccess();
    } catch (error: any) {
      console.error("Error creating transfer order:", error);
      toast.error(error.message || "Failed to create transfer order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dimensions */}
          <div className="space-y-4 border p-4 rounded-lg bg-muted/10">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Dimensions</h3>
            
            <div className="space-y-2">
              <FieldTitle required>LOB (Dimension 1)</FieldTitle>
              <Select
                value={formState.Shortcut_Dimension_1_Code}
                onValueChange={(v) => handleChange("Shortcut_Dimension_1_Code", v)}
              >
                <SelectTrigger>
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
                disabled={!formState.Shortcut_Dimension_1_Code}
              >
                <SelectTrigger>
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
          <div className="space-y-4 border p-4 rounded-lg bg-muted/10">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Transfer Details</h3>
            
            <div className="space-y-2">
              <FieldTitle required>Transfer From</FieldTitle>
              <SearchableSelect
                options={locations.map(l => ({ value: l.Code, label: `${l.Code} - ${l.Name || ""}` }))}
                value={formState.Transfer_from_Code}
                onValueChange={(v) => handleChange("Transfer_from_Code", v)}
                placeholder="Select Source Location"
              />
            </div>

            <div className="space-y-2">
              <FieldTitle required>Transfer To</FieldTitle>
              <SearchableSelect
                options={locations.map(l => ({ value: l.Code, label: `${l.Code} - ${l.Name || ""}` }))}
                value={formState.Transfer_to_Code}
                onValueChange={(v) => handleChange("Transfer_to_Code", v)}
                placeholder="Select Destination Location"
              />
            </div>

            <div className="space-y-2">
              <FieldTitle>In Transit Code</FieldTitle>
              <Input
                value={formState.In_Transit_Code}
                onChange={(e) => handleChange("In_Transit_Code", e.target.value)}
              />
            </div>
          </div>

          {/* Dates & Status */}
          <div className="space-y-4 border p-4 rounded-lg bg-muted/10">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Dates & Shipping</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FieldTitle>Shipment Date</FieldTitle>
                <Input
                  type="date"
                  value={formState.Shipment_Date}
                  onChange={(e) => handleChange("Shipment_Date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <FieldTitle>Receipt Date</FieldTitle>
                <Input
                  type="date"
                  value={formState.Receipt_Date}
                  onChange={(e) => handleChange("Receipt_Date", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <FieldTitle>Shipping Advice</FieldTitle>
              <Select
                value={formState.Shipping_Advice}
                onValueChange={(v) => handleChange("Shipping_Advice", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="Complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Other Info */}
          <div className="space-y-4 border p-4 rounded-lg bg-muted/10">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">System Info</h3>
            
            <div className="space-y-2">
              <FieldTitle>Assigned User ID</FieldTitle>
              <Input
                value={formState.Assigned_User_ID}
                onChange={(e) => handleChange("Assigned_User_ID", e.target.value)}
                readOnly
              />
            </div>

            <div className="flex items-center space-x-2 pt-4">
              <input
                type="checkbox"
                id="directTransfer"
                checked={formState.Direct_Transfer}
                onChange={(e) => handleChange("Direct_Transfer", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="directTransfer" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Direct Transfer
              </label>
            </div>
          </div>
        </div>
      </form>

      <div className="border-t p-4 flex justify-end gap-3 bg-muted/5">
        <Button variant="outline" onClick={() => updateTab({ isSaved: true })} type="button">
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Transfer Order"
          )}
        </Button>
      </div>
    </div>
  );
}
