/**
 * Add Pincode Form
 * Reusable nested form component for adding pincodes
 * Can be opened from any parent form
 */

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldTitle } from "@/components/ui/field";
import { useFormStack } from "@/lib/form-stack/use-form-stack";

interface AddPincodeFormProps {
  tabId: string;
  formData?: Record<string, any>;
  context?: Record<string, any>;
}

export function AddPincodeForm({
  tabId,
  formData: initialFormData,
  context,
}: AddPincodeFormProps) {
  const { registerRefresh, handleSuccess, updateFormData } =
    useFormStack(tabId);
  const [formData, setFormData] = useState({
    pincode: "",
    city: "",
    state: "",
    country: "",
    ...initialFormData,
  });

  useEffect(() => {
    registerRefresh(async () => {
      // TODO: Re-fetch pincode data if editing
      console.log("Refreshing Add Pincode form...");
    });
  }, [registerRefresh]);

  useEffect(() => {
    if (initialFormData) {
      setFormData((prev) => ({ ...prev, ...initialFormData }));
    }
  }, [initialFormData]);

  const handleInputChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    updateFormData(newData);
  };

  const handleSubmit = async () => {
    try {
      // TODO: Implement API call to add pincode
      console.log("Submitting Pincode:", formData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // On success, handle auto-close (if opened from parent)
      await handleSuccess();

      // TODO: Optionally return data to parent form via context
      if (context?.onSuccess) {
        context.onSuccess(formData);
      }
    } catch (error) {
      console.error("Error submitting Pincode:", error);
      // TODO: Show error dialog
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-muted-foreground text-sm font-medium">
              Pincode Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FieldTitle>Pincode *</FieldTitle>
                <Input
                  value={formData.pincode}
                  onChange={(e) => handleInputChange("pincode", e.target.value)}
                  placeholder="Enter pincode"
                  required
                />
              </div>
              <div className="space-y-2">
                <FieldTitle>City *</FieldTitle>
                <Input
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="Enter city"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FieldTitle>State *</FieldTitle>
                <Input
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  placeholder="Enter state"
                  required
                />
              </div>
              <div className="space-y-2">
                <FieldTitle>Country *</FieldTitle>
                <Input
                  value={formData.country}
                  onChange={(e) => handleInputChange("country", e.target.value)}
                  placeholder="Enter country"
                  required
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t px-6 py-4">
        <Button onClick={handleSubmit} className="w-full">
          Add Pincode
        </Button>
      </div>
    </div>
  );
}
