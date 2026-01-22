import type { ProductionOrder } from "@/lib/api/services/production-orders.service";

export type PageSize = 10 | 20 | 30 | 40 | 50;

export type SheetMode = "view" | "edit" | "create";

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
  Description_2?: string;
  Source_Type?: string;
  Source_No: string;
  Quantity: number;
  Location_Code: string;
  Due_Date?: string;
  Starting_Date?: string;
  Ending_Date?: string;
  Supervisor_Name?: string;
  Breed_Code?: string;
  Hatchery_Name?: string;
  Shortcut_Dimension_1_Code?: string;
  Shortcut_Dimension_2_Code?: string;
  Shortcut_Dimension_3_Code?: string;
  Assigned_User_ID?: string;
}

export const EMPTY_FORM_DATA: ProductionOrderFormData = {
  No: "",
  Description: "",
  Description_2: "",
  Source_Type: "",
  Source_No: "",
  Quantity: 0,
  Location_Code: "",
  Due_Date: "",
  Starting_Date: "",
  Ending_Date: "",
  Supervisor_Name: "",
  Breed_Code: "",
  Hatchery_Name: "",
  Shortcut_Dimension_1_Code: "",
  Shortcut_Dimension_2_Code: "",
  Shortcut_Dimension_3_Code: "",
  Assigned_User_ID: "",
};
