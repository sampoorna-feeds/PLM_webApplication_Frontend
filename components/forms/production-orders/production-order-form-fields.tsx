"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductionOrderFormData, SheetMode } from "./types";

interface ProductionOrderFormFieldsProps {
  data: ProductionOrderFormData;
  mode: SheetMode;
  onChange: (data: ProductionOrderFormData) => void;
}

export function ProductionOrderFormFields({
  data,
  mode,
  onChange,
}: ProductionOrderFormFieldsProps) {
  const isReadOnly = mode === "view";

  const handleChange = (
    field: keyof ProductionOrderFormData,
    value: string | number,
  ) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* General Information */}
      <FormSection title="General Information">
        <FormField
          label="Order No"
          value={data.No || ""}
          onChange={(v) => handleChange("No", v)}
          disabled={mode !== "create"}
          placeholder={mode === "create" ? "Auto-generated" : ""}
        />
        <FormField
          label="Description"
          value={data.Description}
          onChange={(v) => handleChange("Description", v)}
          disabled={isReadOnly}
          required
        />
        <FormField
          label="Description 2"
          value={data.Description_2 || ""}
          onChange={(v) => handleChange("Description_2", v)}
          disabled={isReadOnly}
        />
      </FormSection>

      {/* Source Details */}
      <FormSection title="Source Details">
        <FormField
          label="Source Type"
          value={data.Source_Type || ""}
          onChange={(v) => handleChange("Source_Type", v)}
          disabled={isReadOnly}
        />
        <FormField
          label="Source No"
          value={data.Source_No}
          onChange={(v) => handleChange("Source_No", v)}
          disabled={isReadOnly}
          required
        />
        <FormField
          label="Quantity"
          value={data.Quantity}
          onChange={(v) => handleChange("Quantity", Number(v))}
          disabled={isReadOnly}
          type="number"
          required
        />
        <FormField
          label="Location Code"
          value={data.Location_Code}
          onChange={(v) => handleChange("Location_Code", v)}
          disabled={isReadOnly}
          required
        />
      </FormSection>

      {/* Schedule */}
      <FormSection title="Schedule">
        <FormField
          label="Due Date"
          value={data.Due_Date || ""}
          onChange={(v) => handleChange("Due_Date", v)}
          disabled={isReadOnly}
          type="date"
        />
        <FormField
          label="Starting Date"
          value={data.Starting_Date || ""}
          onChange={(v) => handleChange("Starting_Date", v)}
          disabled={isReadOnly}
          type="date"
        />
        <FormField
          label="Ending Date"
          value={data.Ending_Date || ""}
          onChange={(v) => handleChange("Ending_Date", v)}
          disabled={isReadOnly}
          type="date"
        />
      </FormSection>

      {/* Additional Details */}
      <FormSection title="Additional Details">
        <FormField
          label="Supervisor Name"
          value={data.Supervisor_Name || ""}
          onChange={(v) => handleChange("Supervisor_Name", v)}
          disabled={isReadOnly}
        />
        <FormField
          label="Breed Code"
          value={data.Breed_Code || ""}
          onChange={(v) => handleChange("Breed_Code", v)}
          disabled={isReadOnly}
        />
        <FormField
          label="Hatchery Name"
          value={data.Hatchery_Name || ""}
          onChange={(v) => handleChange("Hatchery_Name", v)}
          disabled={isReadOnly}
        />
        <FormField
          label="Assigned User"
          value={data.Assigned_User_ID || ""}
          onChange={(v) => handleChange("Assigned_User_ID", v)}
          disabled={isReadOnly}
        />
      </FormSection>

      {/* Dimensions */}
      <FormSection title="Dimensions">
        <FormField
          label="LOB"
          value={data.Shortcut_Dimension_1_Code || ""}
          onChange={(v) => handleChange("Shortcut_Dimension_1_Code", v)}
          disabled={isReadOnly}
        />
        <FormField
          label="Branch"
          value={data.Shortcut_Dimension_2_Code || ""}
          onChange={(v) => handleChange("Shortcut_Dimension_2_Code", v)}
          disabled={isReadOnly}
        />
        <FormField
          label="LOC"
          value={data.Shortcut_Dimension_3_Code || ""}
          onChange={(v) => handleChange("Shortcut_Dimension_3_Code", v)}
          disabled={isReadOnly}
        />
      </FormSection>
    </div>
  );
}

// Form Section Component
interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

function FormSection({ title, children }: FormSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold border-b pb-2">{title}</h3>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

// Form Field Component
interface FormFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  type?: "text" | "number" | "date";
  placeholder?: string;
}

function FormField({
  label,
  value,
  onChange,
  disabled = false,
  required = false,
  type = "text",
  placeholder,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {disabled ? (
        <p className="text-sm py-2 px-3 bg-muted/50 rounded-md min-h-9 flex items-center">
          {value || "-"}
        </p>
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 text-sm"
        />
      )}
    </div>
  );
}
