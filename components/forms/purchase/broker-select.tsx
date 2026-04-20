"use client";

/**
 * BrokerSelect component for Purchase forms
 * Opens a Dialog with a searchable, sortable, filterable, infinite-scroll table.
 * Columns: No., Name, PAN No., GST Reg. No.
 * Search covers all four fields server-side.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Loader2,
  ChevronDownIcon,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  Check,
  Building2,
  Settings2,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getVendorsForDialog,
  type Vendor,
} from "@/lib/api/services/vendor.service";

export type { Vendor as PurchaseVendor };

interface BrokerSelectProps {
  value: string;
  onChange: (value: string, vendor?: Vendor) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
  errorClass?: string;
}

type SortDirection = "asc" | "desc" | null;

interface ColumnConfig {
  id: string;
  label: string;
  sortable?: boolean;
  filterType?: "text";
  width?: string;
  flex?: boolean;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: "No",
    label: "No.",
    sortable: true,
    filterType: "text",
    width: "140px",
  },
  {
    id: "Name",
    label: "Broker Name",
    sortable: true,
    filterType: "text",
    flex: true,
  },
  {
    id: "City",
    label: "City",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "P_A_N_No",
    label: "PAN No.",
    sortable: true,
    filterType: "text",
    width: "170px",
  },
  {
    id: "GST_Registration_No",
    label: "GST Reg. No.",
    sortable: true,
    filterType: "text",
    width: "210px",
  },
  {
    id: "Address",
    label: "Address",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Address_2",
    label: "Address 2",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
];

const OPTIONAL_COLUMNS: ColumnConfig[] = [
  {
    id: "Name_2",
    label: "Name 2",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Privacy_Blocked",
    label: "Privacy Blocked",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "BalanceAsCustomer",
    label: "BalanceAsCustomer",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Balance_Due_LCY",
    label: "Balance Due LCY",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Document_Sending_Profile",
    label: "Document Sending Profile",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Search_Name",
    label: "Search Name",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Balance_LCY",
    label: "Balance LCY",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Purchaser_Code",
    label: "Purchaser Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Responsibility_Center",
    label: "Responsibility Center",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Blocked",
    label: "Blocked",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Last_Date_Modified",
    label: "Last Date Modified",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Transporter",
    label: "Transporter",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Farmer",
    label: "Farmer",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Broker",
    label: "Broker",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "MSME",
    label: "MSME",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Created_From_Web",
    label: "Created From Web",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Type_of_Enterprise",
    label: "Type of Enterprise",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Constitution_of_Business",
    label: "Constitution of Business",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Status",
    label: "Status",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Creditors_Type",
    label: "Creditors Type",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "TDS_194Q",
    label: "TDS 194Q",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Old_Vendor_No",
    label: "Old Vendor No",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Old_No_Series",
    label: "Old No Series",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Disable_Search_by_Name",
    label: "Disable Search by Name",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Company_Size_Code",
    label: "Company Size Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "State_Code",
    label: "State Code",
    sortable: true,
    filterType: "text",
    width: "120px",
  },
  {
    id: "Country_Region_Code",
    label: "Country Region Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "County",
    label: "County",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Post_Code",
    label: "Post Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "ShowMap",
    label: "ShowMap",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Phone_No",
    label: "Phone No",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "MobilePhoneNo",
    label: "MobilePhoneNo",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Fax_No",
    label: "Fax No",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "E_Mail",
    label: "E Mail",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Home_Page",
    label: "Home Page",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "IC_Partner_Code",
    label: "IC Partner Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Language_Code",
    label: "Language Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Format_Region",
    label: "Format Region",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Primary_Contact_No",
    label: "Primary Contact No",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Control16",
    label: "Control16",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Pay_to_Vendor_No",
    label: "Pay to Vendor No",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "VAT_Registration_No",
    label: "VAT Registration No",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "EORI_Number",
    label: "EORI Number",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "GLN",
    label: "GLN",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Tax_Liable",
    label: "Tax Liable",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Tax_Area_Code",
    label: "Tax Area Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Price_Calculation_Method",
    label: "Price Calculation Method",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Registration_Number",
    label: "Registration Number",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Gen_Bus_Posting_Group",
    label: "Gen Bus Posting Group",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "VAT_Bus_Posting_Group",
    label: "VAT Bus Posting Group",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Vendor_Posting_Group",
    label: "Vendor Posting Group",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Invoice_Disc_Code",
    label: "Invoice Disc Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Prices_Including_VAT",
    label: "Prices Including VAT",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Prepayment_Percent",
    label: "Prepayment Percent",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Allow_Multiple_Posting_Groups",
    label: "Allow Multiple Posting Groups",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Currency_Code",
    label: "Currency Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Application_Method",
    label: "Application Method",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Partner_Type",
    label: "Partner Type",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Payment_Terms_Code",
    label: "Payment Terms Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Payment_Method_Code",
    label: "Payment Method Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Priority",
    label: "Priority",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Cash_Flow_Payment_Terms_Code",
    label: "Cash Flow Payment Terms Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Our_Account_No",
    label: "Our Account No",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Block_Payment_Tolerance",
    label: "Block Payment Tolerance",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Creditor_No",
    label: "Creditor No",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Preferred_Bank_Account_Code",
    label: "Preferred Bank Account Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Intrastat_Partner_Type",
    label: "Intrastat Partner Type",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Exclude_from_Pmt_Practices",
    label: "Exclude from Pmt Practices",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Location_Code",
    label: "Location Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Shipment_Method_Code",
    label: "Shipment Method Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Lead_Time_Calculation",
    label: "Lead Time Calculation",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Base_Calendar_Code",
    label: "Base Calendar Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Customized_Calendar",
    label: "Customized Calendar",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Over_Receipt_Code",
    label: "Over Receipt Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Assessee_Code",
    label: "Assessee Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "P_A_N_Status",
    label: "P A N Status",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "P_A_N_Reference_No",
    label: "P A N Reference No",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Aadhar_No",
    label: "Aadhar No",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "TAN_No",
    label: "TAN No",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "API_aadhaar_Seeding_Status",
    label: "API aadhaar Seeding Status",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "API_Pan_Type",
    label: "API Pan Type",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "API_Full_Name",
    label: "API Full Name",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "API_DOB",
    label: "API DOB",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "SubcontractorVendor",
    label: "SubcontractorVendor",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Vendor_Location",
    label: "Vendor Location",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Commissioner_x0027_s_Permission_No",
    label: "Commissioner Permission No",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Govt_Undertaking",
    label: "Govt Undertaking",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "GST_vendor_Type",
    label: "GST vendor Type",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Associated_Enterprises",
    label: "Associated Enterprises",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Aggregate_Turnover",
    label: "Aggregate Turnover",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "ARN_No",
    label: "ARN No",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "PAN_Link_Status",
    label: "PAN Link Status",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "GST_Name",
    label: "GST Name",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "GST_Address",
    label: "GST Address",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "GST_Address_2",
    label: "GST Address 2",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "GST_Post_Code",
    label: "GST Post Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "GST_State_Code",
    label: "GST State Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "GST_Status",
    label: "GST Status",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Last_Updated_Date",
    label: "Last Updated Date",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "SFPL_POS_as_Vendor_State",
    label: "SFPL POS as Vendor State",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Date_Filter",
    label: "Date Filter",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Global_Dimension_1_Filter",
    label: "Global Dimension 1 Filter",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Global_Dimension_2_Filter",
    label: "Global Dimension 2 Filter",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Currency_Filter",
    label: "Currency Filter",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
];

const ALL_COLUMNS = [...DEFAULT_COLUMNS, ...OPTIONAL_COLUMNS];

const PAGE_SIZE = 30;
const DEBOUNCE_MS = 350;

export function BrokerSelect({
  value,
  onChange,
  placeholder = "Select broker",
  disabled = false,
  className,
  hasError = false,
  errorClass = "",
}: BrokerSelectProps) {
  const [open, setOpen] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {},
  );
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    DEFAULT_COLUMNS.map((c) => c.id),
  );
  const [displayLabel, setDisplayLabel] = useState("");

  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const debouncedSearchRef = useRef(debouncedSearch);
  const sortColumnRef = useRef(sortColumn);
  const sortDirectionRef = useRef(sortDirection);
  const columnFiltersRef = useRef(columnFilters);
  const visibleColumnsRef = useRef(visibleColumns);
  const vendorsLengthRef = useRef(0);
  const totalCountRef = useRef(0);
  const isFetchingMoreRef = useRef(false);

  useEffect(() => {
    debouncedSearchRef.current = debouncedSearch;
    sortColumnRef.current = sortColumn;
    sortDirectionRef.current = sortDirection;
    columnFiltersRef.current = columnFilters;
    visibleColumnsRef.current = visibleColumns;
  }, [debouncedSearch, sortColumn, sortDirection, columnFilters, visibleColumns]);

  useEffect(() => { vendorsLengthRef.current = vendors.length; }, [vendors]);
  useEffect(() => { totalCountRef.current = totalCount; }, [totalCount]);

  const allFetched = totalCount > 0 && vendors.length >= totalCount;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchInitial = useCallback(
    async (
      search: string,
      sortCol: string | null,
      sortDir: SortDirection,
      colFilters: Record<string, string>,
      visCols: string[],
    ) => {
      setLoading(true);
      setVendors([]);
      setTotalCount(0);
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
      try {
        const result = await getVendorsForDialog({ brokerOnly: true,
          skip: 0,
          top: PAGE_SIZE,
          search: search || undefined,
          sortColumn: sortCol,
          sortDirection: sortDir,
          filters: colFilters,
          visibleColumns: visCols,
        });
        setVendors(result.value);
        setTotalCount(result.count);
      } catch (err) {
        console.error("Error loading vendors:", err);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const fetchMore = useCallback(async (currentLength: number) => {
    setLoadingMore(true);
    try {
      const result = await getVendorsForDialog({ brokerOnly: true,
        skip: currentLength,
        top: PAGE_SIZE,
        search: debouncedSearchRef.current || undefined,
        sortColumn: sortColumnRef.current,
        sortDirection: sortDirectionRef.current,
        filters: columnFiltersRef.current,
        visibleColumns: visibleColumnsRef.current,
      });
      setVendors((prev) => {
        const seen = new Set(prev.map((v) => v.No));
        return [...prev, ...result.value.filter((v) => !seen.has(v.No))];
      });
      setTotalCount(result.count);
    } catch (err) {
      console.error("Error loading more vendors:", err);
    } finally {
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchInitial(
        debouncedSearch,
        sortColumn,
        sortDirection,
        columnFilters,
        visibleColumns,
      );
    }
  }, [
    open,
    debouncedSearch,
    fetchInitial,
    sortColumn,
    sortDirection,
    columnFilters,
    visibleColumns,
  ]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const checkAndFetch = () => {
      const total = totalCountRef.current;
      const count = vendorsLengthRef.current;
      if ((total > 0 && count >= total) || isFetchingMoreRef.current) return;
      isFetchingMoreRef.current = true;
      fetchMore(count).finally(() => {
        isFetchingMoreRef.current = false;
      });
    };

    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) checkAndFetch(); },
      { threshold: 0.1 },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [fetchMore, loading]);

  useEffect(() => {
    if (!value) {
      setDisplayLabel("");
      return;
    }
    const found = vendors.find((v) => v.No === value);
    if (found) setDisplayLabel(`${found.No} – ${found.Name}`);
    else if (!displayLabel) setDisplayLabel(value);
  }, [value, vendors]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenChange = (next: boolean) => {
    if (disabled) return;
    if (!next) {
      setSearchQuery("");
      setDebouncedSearch("");
      setColumnFilters({});
      setSortColumn(null);
      setSortDirection(null);
      debouncedSearchRef.current = "";
    }
    setOpen(next);
  };

  const handleSort = (colId: string) => {
    if (sortColumn === colId) {
      if (sortDirection === "asc") setSortDirection("desc");
      else {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(colId);
      setSortDirection("asc");
    }
  };

  const handleFilter = (colId: string, val: string) => {
    setColumnFilters((prev) => ({ ...prev, [colId]: val }));
  };

  const handleSelect = (vendor: Vendor) => {
    onChange(vendor.No, vendor);
    setOpen(false);
  };

  const hasActiveFilters = Object.values(columnFilters).some(Boolean);
  const activeFilterCount = Object.values(columnFilters).filter(Boolean).length;

  const onColumnToggle = (id: string) => {
    setVisibleColumns((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };
  const onResetColumns = () =>
    setVisibleColumns(DEFAULT_COLUMNS.map((c) => c.id));
  const onShowAllColumns = () =>
    setVisibleColumns(ALL_COLUMNS.map((c) => c.id));

  const currentColumns = ALL_COLUMNS.filter((col) =>
    visibleColumns.includes(col.id),
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        disabled={disabled}
        onClick={() => !disabled && setOpen(true)}
        className={cn(
          "h-9 w-full justify-between text-sm font-normal shadow-sm",
          !value && "text-muted-foreground",
          hasError && "border-destructive ring-destructive/20 ring-1",
          className,
          errorClass,
        )}
        data-field-error={hasError}
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {value && (
            <Building2 className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          )}
          <span className="truncate">
            {displayLabel || (disabled ? "None" : placeholder)}
          </span>
        </span>
        <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-40" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        {/* Wide dialog — uses most of the screen width on large displays */}
        <DialogContent
          className="flex h-[88vh] flex-col gap-0 p-0"
          style={{ width: "min(1160px, 92vw)", maxWidth: "none" }}
        >
          {/* ── Header ────────────────────────────────────────────────── */}
          <DialogHeader className="shrink-0 border-b px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="text-muted-foreground h-4 w-4" />
                <DialogTitle className="text-[15px] font-semibold">
                  Select Broker
                </DialogTitle>
                {!loading && totalCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-5 rounded-sm px-1.5 text-[10px] font-bold tabular-nums"
                  >
                    {totalCount.toLocaleString()}
                  </Badge>
                )}
              </div>
              {/* Active filter count pill */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => setColumnFilters({})}
                  className="text-primary hover:text-primary/80 flex items-center gap-1 text-[11px] font-medium transition-colors"
                >
                  <span>
                    {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}{" "}
                    active
                  </span>
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </DialogHeader>

          {/* ── Search bar ────────────────────────────────────────────── */}
          <div className="bg-muted/30 shrink-0 border-b px-5 py-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search by broker No., Name, PAN No. or GST No. …"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-border/60 bg-background h-9 rounded-md pr-9 pl-9 text-sm shadow-none focus-visible:ring-1"
                  autoFocus
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <kbd className="text-muted-foreground/60 absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border px-1.5 py-0.5 font-mono text-[9px] select-none sm:block">
                    ↑↓ to navigate
                  </kbd>
                )}
              </div>
              <VendorColumnVisibility
                visibleColumns={visibleColumns}
                defaultColumns={DEFAULT_COLUMNS}
                optionalColumns={OPTIONAL_COLUMNS}
                onColumnToggle={onColumnToggle}
                onResetColumns={onResetColumns}
                onShowAllColumns={onShowAllColumns}
              />
            </div>
          </div>

          {/* ── Table ─────────────────────────────────────────────────── */}
          <div
            ref={scrollContainerRef}
            className="min-h-0 flex-1 overflow-auto"
          >
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr>
                  {/* Checkmark gutter */}
                  <th className="bg-muted w-10 border-b px-3" />
                  {currentColumns.map((col) => (
                    <VendorTableHead
                      key={col.id}
                      column={col}
                      isActive={sortColumn === col.id}
                      sortDirection={
                        sortColumn === col.id ? sortDirection : null
                      }
                      filterValue={columnFilters[col.id] ?? ""}
                      onSort={handleSort}
                      onFilter={handleFilter}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={currentColumns.length + 1}
                      className="py-20 text-center"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                        <p className="text-muted-foreground text-xs">
                          Loading brokers…
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : vendors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={currentColumns.length + 1}
                      className="py-20 text-center"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="text-muted-foreground/40 h-8 w-8" />
                        <p className="text-muted-foreground text-sm font-medium">
                          No brokers found
                        </p>
                        {searchQuery && (
                          <p className="text-muted-foreground/70 text-xs">
                            Try a different search term or clear filters
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  (() => {
                    // Split: selected vendor first (sticky), rest below
                    const selectedVendor = value
                      ? vendors.find((v) => v.No === value)
                      : null;
                    const restVendors = selectedVendor
                      ? vendors.filter((v) => v.No !== value)
                      : vendors;

                    const renderRow = (
                      vendor: Vendor,
                      idx: number,
                      isSticky = false,
                    ) => {
                      const isSelected = value === vendor.No;
                      return (
                        <tr
                          key={vendor.No}
                          onClick={() => handleSelect(vendor)}
                          className={cn(
                            "group cursor-pointer border-b transition-colors",
                            isSticky
                              ? "hover:brightness-95"
                              : cn(
                                  idx % 2 === 0
                                    ? "bg-background"
                                    : "bg-muted/20",
                                  "hover:bg-primary/5",
                                ),
                          )}
                          style={
                            isSticky
                              ? {
                                  position: "sticky",
                                  top: "40px",
                                  zIndex: 9,
                                  backgroundColor: "var(--muted)",
                                }
                              : undefined
                          }
                        >
                          {/* Checkmark gutter */}
                          <td className="w-10 px-3 py-2.5 text-center">
                            {isSelected && (
                              <Check className="text-primary mx-auto h-3.5 w-3.5" />
                            )}
                          </td>
                          {currentColumns.map((col) => {
                            if (col.id === "No") {
                              return (
                                <td
                                  key={col.id}
                                  className={cn(
                                    "px-3 py-2.5 font-mono text-xs font-semibold whitespace-nowrap",
                                    isSelected
                                      ? "text-primary"
                                      : "text-foreground",
                                  )}
                                >
                                  {(vendor as any)[col.id] || (
                                    <span className="opacity-30">—</span>
                                  )}
                                </td>
                              );
                            }
                            if (col.id === "Name") {
                              return (
                                <td key={col.id} className="px-3 py-2.5">
                                  <span
                                    className={cn(
                                      "w-full text-sm font-medium whitespace-nowrap",
                                      isSelected
                                        ? "text-foreground font-semibold"
                                        : "text-foreground/90",
                                    )}
                                  >
                                    {(vendor as any)[col.id] || (
                                      <span className="opacity-30">—</span>
                                    )}
                                  </span>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={col.id}
                                className={cn(
                                  "px-3 py-2.5 text-xs whitespace-nowrap",
                                  isSelected
                                    ? "text-foreground/80 font-medium"
                                    : "text-muted-foreground",
                                )}
                              >
                                {(vendor as any)[col.id] || (
                                  <span className="opacity-30">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    };

                    return (
                      <>
                        {selectedVendor && renderRow(selectedVendor, 0, true)}
                        {restVendors.map((vendor, idx) =>
                          renderRow(vendor, idx),
                        )}
                      </>
                    );
                  })()
                )}
                {/* Infinite scroll sentinel */}
                {!loading && (
                  <tr>
                    <td colSpan={currentColumns.length + 1}>
                      <div ref={sentinelRef} className="h-px" />
                    </td>
                  </tr>
                )}
                {loadingMore && (
                  <tr>
                    <td
                      colSpan={currentColumns.length + 1}
                      className="py-3 text-center"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground text-xs">
                          Loading more…
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading &&
                  !loadingMore &&
                  allFetched &&
                  vendors.length > 0 && (
                    <tr>
                      <td
                        colSpan={currentColumns.length + 1}
                        className="py-2 text-center"
                      >
                        <span className="text-muted-foreground/50 text-[10px]">
                          All {totalCount.toLocaleString()} brokers loaded
                        </span>
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>

          {/* ── Status bar ────────────────────────────────────────────── */}
          <div className="bg-muted/20 flex shrink-0 items-center justify-between border-t px-5 py-2">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-[11px]">
                {loading ? (
                  "Loading…"
                ) : (
                  <>
                    Showing{" "}
                    <span className="text-foreground font-semibold tabular-nums">
                      {vendors.length.toLocaleString()}
                    </span>
                    {totalCount > 0 && (
                      <>
                        {" "}
                        of{" "}
                        <span className="text-foreground font-semibold tabular-nums">
                          {totalCount.toLocaleString()}
                        </span>
                      </>
                    )}{" "}
                    vendors
                    {hasActiveFilters && (
                      <span className="text-primary ml-1 font-medium">
                        ·{" "}
                        {totalCount > 0
                          ? vendors.length.toLocaleString()
                          : totalCount.toLocaleString()}{" "}
                        match{vendors.length !== 1 ? "es" : ""}
                      </span>
                    )}
                  </>
                )}
              </span>
            </div>
            {value && displayLabel && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[11px]">
                  Selected:
                </span>
                <span className="text-primary max-w-75 truncate text-[11px] font-semibold">
                  {displayLabel}
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Table head helpers ────────────────────────────────────────────────────────

interface VendorTableHeadProps {
  column: ColumnConfig;
  isActive: boolean;
  sortDirection: SortDirection;
  filterValue: string;
  onSort: (id: string) => void;
  onFilter: (id: string, value: string) => void;
}

function VendorTableHead({
  column,
  isActive,
  sortDirection,
  filterValue,
  onSort,
  onFilter,
}: VendorTableHeadProps) {
  const getSortIcon = () => {
    if (!isActive || !sortDirection) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-3 w-3" />;
    }
    return <ArrowDown className="h-3 w-3" />;
  };

  return (
    <th
      className={cn(
        "text-foreground bg-muted h-10 border-b px-2 py-3 text-left align-middle text-xs font-bold whitespace-nowrap select-none",
        isActive ? "text-primary" : "",
        column.flex && "w-full",
      )}
      style={
        column.width
          ? { width: column.width, minWidth: column.width }
          : undefined
      }
    >
      <div className="flex items-center gap-1.5">
        <span
          className="hover:text-primary cursor-pointer transition-colors"
          onClick={() => column.sortable && onSort(column.id)}
        >
          {column.label}
        </span>
        {column.sortable && (
          <button
            type="button"
            className="hover:text-primary transition-colors"
            onClick={() => onSort(column.id)}
          >
            {getSortIcon()}
          </button>
        )}
        {column.filterType && (
          <VendorColumnFilter
            column={column}
            value={filterValue}
            onChange={(v) => onFilter(column.id, v)}
          />
        )}
      </div>
    </th>
  );
}

interface VendorColumnFilterProps {
  column: ColumnConfig;
  value: string;
  onChange: (value: string) => void;
}

function VendorColumnFilter({
  column,
  value,
  onChange,
}: VendorColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const hasFilter = !!value;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`hover:bg-background/50 rounded p-0.5 transition-colors ${
            hasFilter
              ? "text-primary"
              : "text-muted-foreground/50 hover:text-muted-foreground"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
        >
          <Filter className={`h-3 w-3 ${hasFilter ? "fill-current" : ""}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-52 p-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <Label className="text-foreground text-xs font-semibold">
            Filter by {column.label}
          </Label>
          <Input
            placeholder={`Search ${column.label}…`}
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="h-8 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onChange(local);
                setOpen(false);
              }
              if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            autoFocus
          />
        </div>
        <div className="mt-2.5 flex gap-2">
          <Button
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => {
              onChange(local);
              setOpen(false);
            }}
          >
            Apply
          </Button>
          {hasFilter && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              onClick={() => {
                setLocal("");
                onChange("");
                setOpen(false);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function VendorColumnVisibility({
  visibleColumns,
  defaultColumns,
  optionalColumns,
  onColumnToggle,
  onResetColumns,
  onShowAllColumns,
}: {
  visibleColumns: string[];
  defaultColumns: ColumnConfig[];
  optionalColumns: ColumnConfig[];
  onColumnToggle: (columnId: string) => void;
  onResetColumns: () => void;
  onShowAllColumns: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [columnSearch, setColumnSearch] = useState("");

  const visibleCount = visibleColumns.length;
  const totalCount = defaultColumns.length + optionalColumns.length;

  const filteredDefault = defaultColumns.filter((c) =>
    c.label.toLowerCase().includes(columnSearch.toLowerCase()),
  );
  const filteredOptional = optionalColumns.filter((c) =>
    c.label.toLowerCase().includes(columnSearch.toLowerCase()),
  );

  useEffect(() => {
    if (!open) {
      setTimeout(() => setColumnSearch(""), 150); // delay clear to avoid flicker during close animation
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0 gap-2">
          <Settings2 className="h-4 w-4" />
          Columns ({visibleCount}/{totalCount})
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-70 p-0"
        align="end"
        onWheel={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="border-b p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Toggle Columns</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onShowAllColumns}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onResetColumns}
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="border-b p-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              placeholder="Search columns..."
              value={columnSearch}
              onChange={(e) => setColumnSearch(e.target.value)}
              className="bg-background border-border/50 h-8 rounded-sm pl-8 text-xs shadow-none focus-visible:ring-1"
            />
          </div>
        </div>

        <div
          className="max-h-80 overflow-x-hidden overflow-y-auto overscroll-contain p-2"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {filteredDefault.length > 0 && (
            <div className="mb-2">
              <span className="text-muted-foreground px-2 text-[10px] font-semibold tracking-wider uppercase">
                Default Columns
              </span>
              <div className="mt-1 space-y-0.5">
                {filteredDefault.map((column) => (
                  <ColumnToggleItem
                    key={column.id}
                    column={column}
                    isChecked={visibleColumns.includes(column.id)}
                    onToggle={() => onColumnToggle(column.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredDefault.length > 0 && filteredOptional.length > 0 && (
            <Separator className="my-2" />
          )}

          {filteredOptional.length > 0 && (
            <div>
              <span className="text-muted-foreground px-2 text-[10px] font-semibold tracking-wider uppercase">
                Additional Columns
              </span>
              <div className="mt-1 space-y-0.5">
                {filteredOptional.map((column) => (
                  <ColumnToggleItem
                    key={column.id}
                    column={column}
                    isChecked={visibleColumns.includes(column.id)}
                    onToggle={() => onColumnToggle(column.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredDefault.length === 0 && filteredOptional.length === 0 && (
            <div className="text-muted-foreground py-6 text-center text-xs">
              No columns matched your search
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ColumnToggleItem({
  column,
  isChecked,
  isDisabled = false,
  onToggle,
}: {
  column: ColumnConfig;
  isChecked: boolean;
  isDisabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 ${
        isDisabled ? "cursor-not-allowed opacity-60" : ""
      }`}
      onClick={() => !isDisabled && onToggle()}
    >
      <Checkbox
        checked={isChecked}
        disabled={isDisabled}
        onCheckedChange={() => !isDisabled && onToggle()}
        className="pointer-events-none"
      />
      <span className="text-sm">{column.label}</span>
    </div>
  );
}
