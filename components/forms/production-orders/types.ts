import type { ProductionOrder } from "@/lib/api/services/production-orders.service";

export type PageSize = 10 | 20 | 30 | 40 | 50;

export type SheetMode = "view" | "edit" | "create";

export type SourceType = "Item" | "Family" | "Sales Header" | "";

export type BatchSize = "0.8" | "1.0" | "1.5" | "2.0" | "";

export interface PaginationState {
  pageSize: PageSize;
  currentPage: number;
  totalItems: number;
}

export interface ProductionOrdersTableProps {
  orders: ProductionOrder[];
  isLoading: boolean;
  onRowClick: (orderNo: string) => void;
}

export interface ProductionOrderSheetProps {
  order: ProductionOrder | null;
  open: boolean;
  mode: SheetMode;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: SheetMode) => void;
  onSave: (data: ProductionOrderFormData) => Promise<void>;
  isSaving: boolean;
}

export interface PaginationControlsProps {
  pageSize: PageSize;
  currentPage: number;
  totalPages: number;
  onPageSizeChange: (size: PageSize) => void;
  onPageChange: (page: number) => void;
}

export interface ProductionOrderFormData {
  No?: string;
  Description: string;
  // Dimension fields
  Shortcut_Dimension_1_Code: string; // LOB
  Shortcut_Dimension_2_Code: string; // Branch Code
  Shortcut_Dimension_3_Code: string; // LOC Code
  // Source fields
  Source_Type: SourceType;
  Source_No: string;
  // Core fields
  Quantity: number;
  Due_Date: string;
  Location_Code: string;
  Hatching_Date: string;
  // BOM fields (only for Item source type)
  Prod_Bom_No: string;
  BOM_Version_No: string;
  isProdBomFromItem: boolean; // tracks if BOM came from item (uneditable) or manual
  // Other fields
  Batch_Size: BatchSize;
}

export const EMPTY_FORM_DATA: ProductionOrderFormData = {
  No: "",
  Description: "",
  Shortcut_Dimension_1_Code: "",
  Shortcut_Dimension_2_Code: "",
  Shortcut_Dimension_3_Code: "",
  Source_Type: "",
  Source_No: "",
  Quantity: 0,
  Due_Date: "",
  Location_Code: "",
  Hatching_Date: "",
  Prod_Bom_No: "",
  BOM_Version_No: "",
  isProdBomFromItem: false,
  Batch_Size: "",
};

export const SOURCE_TYPE_OPTIONS: SourceType[] = [
  "Item",
  "Family",
  "Sales Header",
];

export const BATCH_SIZE_OPTIONS: BatchSize[] = ["0.8", "1.0", "1.5", "2.0"];
