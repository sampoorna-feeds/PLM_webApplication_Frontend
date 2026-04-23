import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LocationSelect } from "@/components/forms/shared/location-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SuccessDialog } from "@/components/ui/success-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAllLOCsFromUserSetup,
  getBranches,
  getBranchesFromUserSetup,
  getLOBs,
  getLOBsFromUserSetup,
  getWebUserSetup,
  type DimensionValue,
  type WebUserSetup,
} from "@/lib/api/services/dimension.service";
import {
  createTransferOrder,
  deleteTransferLine,
  getDownloadRecordLink,
  getPostedTransferReceiptsByOrder,
  getPostedTransferShipmentsByOrder,
  getTransferAllLocationCodes,
  getTransferOrderByNo,
  getTransferOrderLines,
  getTransferShipmentReport,
  patchTransferOrder,
  postTransferOrder,
  releaseTransferOrder,
  reopenTransferOrder,
  type PostedTransferShipment,
  type TransferLine,
  type TransferLocationCode,
  type TransferOrder,
} from "@/lib/api/services/transfer-orders.service";
import {
  getVendorsForDialog,
  type Vendor as Transporter,
} from "@/lib/api/services/vendor.service";
import { useAuth } from "@/components/providers/auth-provider";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { cn } from "@/lib/utils";
import { Download, Eye, Loader2, Plus, Printer, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ItemSelect } from "./item-select";
import { TransferOrderLineDetailsDialog } from "./transfer-order-line-details-dialog";
import { TransferOrderLineDialog } from "./transfer-order-line-dialog";
import { TransferOrderLinesTable } from "./transfer-order-lines-table";
import { TransporterSelect } from "@/components/forms/shared/transporter-select";

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
  const [locations, setLocations] = useState<TransferLocationCode[]>([]); // These will be used for Transfer-from
  const [allLocations, setAllLocations] = useState<TransferLocationCode[]>([]); // These will be used for Transfer-to
  const [authorizedLOCs, setAuthorizedLOCs] = useState<string[]>([]);
  const [transporters, setTransporters] = useState<Vendor[]>([]);
  const [isLoadingDimensions, setIsLoadingDimensions] = useState(false);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [postSelection, setPostSelection] = useState<"ship" | "receive">(
    "ship",
  );
  const [postStep, setPostStep] = useState<1 | 2>(1);

  // Report states
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportShipments, setReportShipments] = useState<
    PostedTransferShipment[]
  >([]);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [activeReportDocNo, setActiveReportDocNo] = useState<string | null>(
    null,
  );
  const [reportPdfUrls, setReportPdfUrls] = useState<Record<string, string>>(
    {},
  );
  const [reportType, setReportType] = useState<"shipment" | "receipt">(
    "shipment",
  );
  const [reportDocuments, setReportDocuments] = useState<any[]>([]);

  // Success Dialog State
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successInfo, setSuccessInfo] = useState({ title: "", message: "" });

  // Debug: Monitor locations state changes
  useEffect(() => {
    console.log(
      "DEBUG: Authorized locations (From):",
      locations.length,
      locations,
    );
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
  const fetchOrderData = useCallback(
    async (no: string, showFullLoader: boolean = true) => {
      if (showFullLoader) setIsLoading(true);
      setIsLoadingLines(true);
      try {
        const order = await getTransferOrderByNo(no);
        if (order) {
          setFormState(order);
          setOriginalState(order);
          const linesData = await getTransferOrderLines(no);
          setLines(linesData);
        } else {
          // Order might have been deleted/moved after posting
          console.log(`Order ${no} not found, likely posted and moved to history.`);
        }
      } catch (err) {
        console.error("Error fetching order data:", err);
        toast.error("Failed to load order data");
      } finally {
        setIsLoading(false);
        setIsLoadingLines(false);
      }
    },
    [],
  );

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

  // Ensure current order codes are in the select options
  useEffect(() => {
    if (formState.Transfer_from_Code && locations.length > 0) {
      if (!locations.some((l) => l.Code === formState.Transfer_from_Code)) {
        setLocations((prev) => [
          ...prev,
          {
            Code: formState.Transfer_from_Code!,
            Name: formState.Transfer_from_Name || "",
          },
        ]);
      }
    }
    if (formState.Transfer_to_Code && allLocations.length > 0) {
      if (!allLocations.some((l) => l.Code === formState.Transfer_to_Code)) {
        setAllLocations((prev) => [
          ...prev,
          {
            Code: formState.Transfer_to_Code!,
            Name: formState.Transfer_to_Name || "",
          },
        ]);
      }
    }
  }, [
    formState.Transfer_from_Code,
    formState.Transfer_to_Code,
    formState.Transfer_from_Name,
    formState.Transfer_to_Name,
    locations.length,
    allLocations.length,
  ]);

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
        const authCodes = authLOCEntries.map((l) => l.Code).filter(Boolean);
        const fromLocations =
          authCodes.length > 0
            ? await getTransferAllLocationCodes(authCodes)
            : [];

        // Rule 2: Transfer-to fetches ALL locations without boundation
        const toLocations = await getTransferAllLocationCodes();

        // Fallback to general LOBs if user setup doesn't exist
        if (lobData.length === 0) {
          lobData = await getLOBs();
        }

        // Ensure current order's locations are in the lists so they show up even if not in current user's setup
        let finalFromLocs = [...fromLocations];
        if (
          formState.Transfer_from_Code &&
          !finalFromLocs.some((l) => l.Code === formState.Transfer_from_Code)
        ) {
          console.log(
            "Adding missing From-Code from order into options:",
            formState.Transfer_from_Code,
          );
          finalFromLocs.push({
            Code: formState.Transfer_from_Code,
            Name: formState.Transfer_from_Name || "Loading...",
          });
        }

        let finalToLocs = [...toLocations];
        if (
          formState.Transfer_to_Code &&
          !finalToLocs.some((l) => l.Code === formState.Transfer_to_Code)
        ) {
          console.log(
            "Adding missing To-Code from order into options:",
            formState.Transfer_to_Code,
          );
          finalToLocs.push({
            Code: formState.Transfer_to_Code,
            Name: formState.Transfer_to_Name || "Loading...",
          });
        }

        setLobs(lobData);
        setAuthorizedLOCs(authCodes);
        setLocations(finalFromLocs);
        setAllLocations(finalToLocs);

        // Load initial transporters
        const vendorData = await getTransporters();

        // Ensure current order's transporter is in the list
        let finalTransporters = [...vendorData];
        if (
          formState.Transporter_Code &&
          !finalTransporters.some((v) => v.No === formState.Transporter_Code)
        ) {
          finalTransporters.push({
            No: formState.Transporter_Code,
            Name: formState.Transporter_Name || "Loading...",
          } as any);
        }
        setTransporters(finalTransporters);

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

  // Cleanup report blob URLs on unmount
  useEffect(() => {
    const urls = Object.values(reportPdfUrls);
    return () => {
      urls.forEach((url) => window.URL.revokeObjectURL(url));
    };
  }, [reportPdfUrls]);

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
      };

      // Priority: Send Transporter_Code if available, otherwise fallback to Transporter_Name
      if (formState.Transporter_Code) {
        payload.Transporter_Code = formState.Transporter_Code;
      } else if (formState.Transporter_Name) {
        payload.Transporter_Name = formState.Transporter_Name;
      }

      // Clean empty strings
      Object.keys(payload).forEach((key) => {
        if ((payload as any)[key] === "") {
          delete (payload as any)[key];
        }
      });

      console.log("Creating transfer order header with payload:", payload);

      const response = await createTransferOrder(payload);
      setSuccessInfo({
        title: "Order Created!",
        message: `Transfer Order ${response.No} has been created successfully.`,
      });
      setSuccessDialogOpen(true);

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
      "Mode_of_Transport",
    ];

    const diff: Partial<TransferOrder> = {};
    allowedToUpdate.forEach((k) => {
      const key = k as keyof TransferOrder;
      if (formState[key] !== originalState[key]) {
        (diff as any)[key] = formState[key] || "";
      }
    });

    // Ensure we don't send both Transporter_Code and Transporter_Name to avoid API conflicts
    if (diff.Transporter_Code) {
      delete diff.Transporter_Name;
    }

    if (Object.keys(diff).length === 0) {
      toast.info("No changes to update");
      return;
    }

    setIsSubmitting(true);
    try {
      await patchTransferOrder(formState.No, diff);
      setSuccessInfo({
        title: "Header Updated",
        message: `Order ${formState.No} has been updated successfully.`,
      });
      setSuccessDialogOpen(true);
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
        "Mode_of_Transport",
      ];

      const diff: Partial<TransferOrder> = {};
      allowedToUpdate.forEach((k) => {
        const key = k as keyof TransferOrder;
        if (formState[key] !== originalState[key]) {
          (diff as any)[key] =
            formState[key] || (typeof formState[key] === "number" ? 0 : "");
        }
      });

      // Ensure we don't send both Transporter_Code and Transporter_Name to avoid API conflicts
      if (diff.Transporter_Code) {
        delete diff.Transporter_Name;
      }

      let isHeaderUpdated = false;
      if (Object.keys(diff).length > 0) {
        await patchTransferOrder(formState.No, diff);
        console.log("Header updated before posting:", diff);
        isHeaderUpdated = true;
      }

      await postTransferOrder({
        docNo: formState.No,
        postShipment: postSelection === "ship" ? "True" : "False",
        postReceipt: postSelection === "receive" ? "True" : "False",
      });

      // Refresh page data to reflect changes (quantities, status etc)
      fetchOrderData(formState.No);

      // Notify parent list to refresh
      if (context?.onOrderPosted) {
        context.onOrderPosted();
      }

      setSuccessInfo({
        title: isHeaderUpdated
          ? "Header Updated & Order Posted!"
          : "Order Posted Successfully!",
        message: isHeaderUpdated
          ? `Changes were saved and Order ${formState.No} has been posted.`
          : `Transfer Order ${formState.No} has been posted successfully.`,
      });
      setSuccessDialogOpen(true);
      setIsPostDialogOpen(false);
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

  const handleRelease = async () => {
    if (!formState.No) return;

    setIsSubmitting(true);
    try {
      await releaseTransferOrder(formState.No);
      toast.success("Transfer Order released successfully");
      fetchOrderData(formState.No);
    } catch (error: any) {
      console.error("Error releasing transfer order:", error);
      toast.error(error.message || "Failed to release transfer order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReportDialog = (
    type: "shipment" | "receipt" = "shipment",
  ) => {
    setReportType(type);
    setIsReportDialogOpen(true);
    setReportDocuments([]);
    // Automatically load data when the dialog opens
    loadReportData(formState.No, type);
  };

  const loadReportData = async (
    orderNo?: string,
    type: "shipment" | "receipt" = "shipment",
  ) => {
    const targetNo = orderNo || formState.No;
    if (!targetNo) return;

    setIsReportLoading(true);
    try {
      const docs =
        type === "shipment"
          ? await getPostedTransferShipmentsByOrder(targetNo)
          : await getPostedTransferReceiptsByOrder(targetNo);

      setReportDocuments(docs || []);
      if (docs.length === 0) {
        toast.info(`No ${type}s found for this order.`);
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to load ${type}s`);
    } finally {
      setIsReportLoading(false);
    }
  };

  const base64ToPdfBlob = (base64Value: string) => {
    const normalized = base64Value
      .replace(/^data:application\/pdf;base64,/, "")
      .replace(/\s/g, "");
    const byteCharacters = atob(normalized);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });
  };

  const getReportPdfUrl = async (shipmentNo: string) => {
    if (reportPdfUrls[shipmentNo]) return reportPdfUrls[shipmentNo];

    setActiveReportDocNo(shipmentNo);
    try {
      const base64Data = await getTransferShipmentReport(shipmentNo);
      if (!base64Data) throw new Error("No PDF content returned.");

      const blob = base64ToPdfBlob(base64Data);
      const url = window.URL.createObjectURL(blob);
      setReportPdfUrls((prev) => ({ ...prev, [shipmentNo]: url }));
      return url;
    } finally {
      setActiveReportDocNo(null);
    }
  };

  const handlePreviewReport = async (shipmentNo: string) => {
    try {
      const url = await getReportPdfUrl(shipmentNo);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(err.message || "Failed to preview report");
    }
  };

  const handleDownloadReport = async (shipmentNo: string) => {
    try {
      const url = await getReportPdfUrl(shipmentNo);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Shipment_Report_${shipmentNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      toast.error(err.message || "Failed to download report");
    }
  };

  const handleNextStep = async () => {
    const today = new Date().toISOString().split("T")[0];
    const updates: any = {};

    // 1. Smart defaults if fields are empty or 'zero'
    if (!formState.Posting_Date || formState.Posting_Date === "0001-01-01") {
      updates.Posting_Date = today;
    }
    if (!formState.LR_RR_Date || formState.LR_RR_Date === "0001-01-01") {
      updates.LR_RR_Date = today;
    }
    if (!formState.Mode_of_Transport) {
      updates.Mode_of_Transport = "Road";
    }

    // 2. Pre-fill from any existing posted shipment (helps both partial shipments and receipts)
    if (formState.No) {
      try {
        const shipments = await getPostedTransferShipmentsByOrder(formState.No);
        if (shipments && shipments.length > 0) {
          const latest = shipments[0];
          if (!formState.Vehicle_No && latest.Vehicle_No)
            updates.Vehicle_No = latest.Vehicle_No;
          if (!formState.LR_RR_No && latest.LR_RR_No)
            updates.LR_RR_No = latest.LR_RR_No;
          if (
            (!formState.LR_RR_Date || formState.LR_RR_Date === "0001-01-01") &&
            latest.LR_RR_Date &&
            latest.LR_RR_Date !== "0001-01-01"
          ) {
            updates.LR_RR_Date = latest.LR_RR_Date;
          }
          if (!formState.External_Document_No && latest.External_Document_No)
            updates.External_Document_No = latest.External_Document_No;
          if (!formState.Mode_of_Transport && (latest as any).Mode_of_Transport)
            updates.Mode_of_Transport = (latest as any).Mode_of_Transport;

          if (!formState.Transporter_Code && (latest as any).Transporter_Code) {
            updates.Transporter_Code = (latest as any).Transporter_Code;
            updates.Transporter_Name = (latest as any).Transporter_Name || "";
          }
        }
      } catch (err) {
        console.error("Error pre-filling from shipment:", err);
      }
    }

    if (Object.keys(updates).length > 0) {
      setFormState((prev) => ({ ...prev, ...updates }));
    }

    setPostStep(2);
  };

  const handlePrintReport = async (shipmentNo: string) => {
    try {
      const url = await getReportPdfUrl(shipmentNo);
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
      };
    } catch (err: any) {
      toast.error(err.message || "Failed to print report");
    }
  };

  const handleGetRecordLink = async (
    docType: string,
    docNo: string,
    reportName: string,
  ) => {
    setActiveReportDocNo(docNo);
    try {
      const url = await getDownloadRecordLink({
        documentType: docType,
        documentNo: docNo,
      });
      if (!url) {
        toast.info(`No URL returned for ${reportName}`);
        return;
      }

      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${docNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      toast.error(err.message || `Failed to get ${reportName} link`);
    } finally {
      setActiveReportDocNo(null);
    }
  };

  const handlePrintRecord = async (
    docType: string,
    docNo: string,
    reportName: string,
  ) => {
    setActiveReportDocNo(docNo);
    try {
      const url = await getDownloadRecordLink({
        documentType: docType,
        documentNo: docNo,
      });
      if (!url) {
        toast.info(`No URL returned for ${reportName}`);
        return;
      }

      // Fetch the PDF to create a local blob for downloading with extension
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${docNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up after delay
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 5000);
    } catch (err: any) {
      toast.error(err.message || `Failed to print ${reportName}`);
    } finally {
      setActiveReportDocNo(null);
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
              {formState.No ? `Order ${formState.No}` : "New Transfer Order"}
            </h2>
            <div className="flex items-center gap-4">
              {formState.Status && (
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-bold tracking-wider uppercase",
                    formState.Status === "Released"
                      ? "border-green-500/20 bg-green-100/10 text-green-500"
                      : "border-blue-500/20 bg-blue-100/10 text-blue-500",
                  )}
                >
                  {formState.Status}
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

                {formState.No && (
                  <Button
                    onClick={() => handleOpenReportDialog("shipment")}
                    variant="outline"
                    size="sm"
                    className="border-primary text-primary hover:bg-primary/10 font-bold transition-all hover:scale-105 active:scale-95"
                  >
                    Shipment Reports
                  </Button>
                )}
                {(formState.Status === "Released" ||
                  formState.Status === "Open") &&
                  formState.No && (
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
                {formState.Status === "Open" && formState.No && (
                  <Button
                    onClick={handleRelease}
                    variant="outline"
                    size="sm"
                    className="border-primary text-primary hover:bg-primary/10 font-bold transition-all hover:scale-105 active:scale-95"
                  >
                    Release
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

          <div className={cn("space-y-4", formState.No && "opacity-90")}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* 1. Transfer Locations */}
              <section className="space-y-1">
                <h3 className="text-muted-foreground mb-1 border-b pb-0.5 text-[11px] font-bold tracking-wider uppercase">
                  Transfer Locations
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className={fieldClass}>
                    <label className={labelClass}>Transfer-from Code</label>
                    <LocationSelect
                      value={formState.Transfer_from_Code || ""}
                      onChange={(v, loc) => {
                        setFormState((prev) => ({
                          ...prev,
                          Transfer_from_Code: v,
                          Transfer_from_Name: loc?.Name || "",
                        }));
                        updateTab({ isSaved: false });
                      }}
                      authorizedCodes={authorizedLOCs}
                      placeholder="Select Source"
                      disabled={formState.Status === "Released"}
                    />
                    {formState.Transfer_from_Name && (
                      <p className="text-primary animate-in fade-in mt-1 truncate pl-1 text-[10px] font-medium duration-300">
                        {formState.Transfer_from_Name}
                      </p>
                    )}
                  </div>
                  <div className={fieldClass}>
                    <label className={labelClass}>Transfer-to Code</label>
                    <LocationSelect
                      value={formState.Transfer_to_Code || ""}
                      onChange={(v, loc) => {
                        setFormState((prev) => ({
                          ...prev,
                          Transfer_to_Code: v,
                          Transfer_to_Name: loc?.Name || "",
                        }));
                        updateTab({ isSaved: false });
                      }}
                      placeholder="Select Destination"
                      disabled={formState.Status === "Released"}
                    />
                    {formState.Transfer_to_Name && (
                      <p className="text-primary animate-in fade-in mt-1 truncate pl-1 text-[10px] font-medium duration-300">
                        {formState.Transfer_to_Name}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* 2. Order Details */}
              <section className="space-y-1">
                <h3 className="text-muted-foreground mb-1 border-b pb-0.5 text-[11px] font-bold tracking-wider uppercase">
                  Order Details
                </h3>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div className={fieldClass}>
                    <label className={labelClass}>No.</label>
                    <Input
                      value={formState.No}
                      readOnly
                      disabled
                      className="bg-muted h-8"
                      placeholder="Auto"
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
                    <label className={labelClass}>Ext. Doc No.</label>
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

              {/* 3. Dimensions */}
              <section className="space-y-1">
                <h3 className="text-muted-foreground mb-1 border-b pb-0.5 text-[11px] font-bold tracking-wider uppercase">
                  Dimensions
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                    <label className={labelClass}>In-Transit</label>
                    <Input
                      value={formState.In_Transit_Code}
                      readOnly
                      disabled
                      className="bg-muted h-8"
                    />
                  </div>
                </div>
              </section>
            </div>

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
                  <SearchableSelect
                    options={[
                      { value: "Road", label: "Road" },
                      { value: "Rail", label: "Rail" },
                      { value: "Air", label: "Air" },
                      { value: "Ship", label: "Ship" },
                      { value: "Owner", label: "Owner" },
                      { value: "Hand", label: "Hand" },
                    ]}
                    value={formState.Mode_of_Transport || ""}
                    onValueChange={(v) => {
                      handleChange("Mode_of_Transport", v);
                    }}
                    placeholder="Select Mode"
                    disabled={formState.Status === "Released"}
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
                  <TransporterSelect
                    value={formState.Transporter_Code || ""}
                    onChange={(v, transporter) => {
                      setFormState((prev) => ({
                        ...prev,
                        Transporter_Code: v,
                        Transporter_Name: transporter?.Name || "",
                      }));
                      updateTab({ isSaved: false });
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
                    disabled={
                      formState.Status === "Released" ||
                      !!formState.Transporter_Code
                    }
                    className={cn(
                      "h-8",
                      !!formState.Transporter_Code && "bg-muted",
                    )}
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
        onSuccess={() => fetchOrderData(formState.No!, false)}
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
          transferToCode={formState.Transfer_to_Code}
          onSuccess={() => fetchOrderData(formState.No!, false)}
        />
      )}

      {/* Post Dialog */}
      {/* Post Dialog */}
      <Dialog
        open={isPostDialogOpen}
        onOpenChange={(open) => {
          setIsPostDialogOpen(open);
          if (!open) setPostStep(1); // Reset step when closing
        }}
      >
        <DialogContent className="bg-background border-border rounded-2xl sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Post Transfer Order
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {postStep === 1
                ? "Choose how you want to post this transfer order."
                : "Review and update order details before final posting."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {postStep === 1 ? (
              /* Step 1: Post Options */
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={cn(
                    "flex cursor-pointer flex-row items-center space-x-3 rounded-2xl border-2 p-3.5 transition-all duration-300",
                    postSelection === "ship"
                      ? "border-green-600 bg-green-600/10 shadow-[0_0_20px_rgba(22,163,74,0.1)]"
                      : "border-border hover:bg-muted hover:border-green-600/50",
                  )}
                  onClick={() => setPostSelection("ship")}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full border-2",
                      postSelection === "ship"
                        ? "border-green-600"
                        : "border-muted-foreground",
                    )}
                  >
                    {postSelection === "ship" && (
                      <div className="h-2 w-2 rounded-full bg-green-600" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-bold",
                      postSelection === "ship"
                        ? "text-green-500"
                        : "text-foreground",
                    )}
                  >
                    Shipment
                  </span>
                </div>

                <div
                  className={cn(
                    "flex cursor-pointer flex-row items-center space-x-3 rounded-2xl border-2 p-3.5 transition-all duration-300",
                    postSelection === "receive"
                      ? "border-green-600 bg-green-600/10 shadow-[0_0_20px_rgba(22,163,74,0.1)]"
                      : "border-border hover:bg-muted hover:border-green-600/50",
                  )}
                  onClick={() => setPostSelection("receive")}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full border-2",
                      postSelection === "receive"
                        ? "border-green-600"
                        : "border-muted-foreground",
                    )}
                  >
                    {postSelection === "receive" && (
                      <div className="h-2 w-2 rounded-full bg-green-600" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-bold",
                      postSelection === "receive"
                        ? "text-green-500"
                        : "text-foreground",
                    )}
                  >
                    Receipt
                  </span>
                </div>
              </div>
            ) : (
              /* Step 2: Additional Fields Form */
              <div className="animate-in fade-in slide-in-from-right-4 grid grid-cols-2 gap-x-6 gap-y-5 duration-300">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                    Posting Date
                  </label>
                  <DateInput
                    value={
                      formState.Posting_Date
                        ? formState.Posting_Date.split("T")[0]
                        : ""
                    }
                    onChange={(val) => handleChange("Posting_Date", val)}
                    className="border-border h-10 focus:border-green-600/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                    External Document No.
                  </label>
                  <Input
                    value={formState.External_Document_No || ""}
                    onChange={(e) =>
                      handleChange("External_Document_No", e.target.value)
                    }
                    className="border-border h-10 focus:border-green-600/50"
                    placeholder="Enter External Doc No"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                    Vehicle No.
                  </label>
                  <Input
                    value={formState.Vehicle_No || ""}
                    onChange={(e) => handleChange("Vehicle_No", e.target.value)}
                    className="border-border h-10 focus:border-green-600/50"
                    placeholder="Enter Vehicle No"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                    LR/RR No.
                  </label>
                  <Input
                    value={formState.LR_RR_No || ""}
                    onChange={(e) => handleChange("LR_RR_No", e.target.value)}
                    className="border-border h-10 focus:border-green-600/50"
                    placeholder="Enter LR/RR No"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                    LR/RR Date
                  </label>
                  <DateInput
                    value={
                      formState.LR_RR_Date &&
                      formState.LR_RR_Date !== "0001-01-01"
                        ? formState.LR_RR_Date.split("T")[0]
                        : ""
                    }
                    onChange={(val) => handleChange("LR_RR_Date", val)}
                    className="border-border h-10 focus:border-green-600/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                    Distance (Km)
                  </label>
                  <Input
                    type="number"
                    value={formState.Distance_Km || 0}
                    onChange={(e) =>
                      handleChange(
                        "Distance_Km",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="border-border h-10 focus:border-green-600/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                    Freight Value
                  </label>
                  <Input
                    type="number"
                    value={formState.Freight_Value || 0}
                    onChange={(e) =>
                      handleChange(
                        "Freight_Value",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="border-border h-10 focus:border-green-600/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                    Mode of Transport
                  </label>
                  <SearchableSelect
                    options={[
                      { value: "Road", label: "Road" },
                      { value: "Rail", label: "Rail" },
                      { value: "Air", label: "Air" },
                      { value: "Ship", label: "Ship" },
                      { value: "Owner", label: "Owner" },
                      { value: "Hand", label: "Hand" },
                    ]}
                    value={formState.Mode_of_Transport || ""}
                    onValueChange={(v) => {
                      handleChange("Mode_of_Transport", v);
                    }}
                    placeholder="Select Mode"
                  />
                </div>
                <div className="bg-muted border-border col-span-2 grid grid-cols-2 gap-6 rounded-xl border p-4">
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                      Transporter
                    </label>
                    <TransporterSelect
                      value={formState.Transporter_Code || ""}
                      onChange={(v, transporter) => {
                        setFormState((prev) => ({
                          ...prev,
                          Transporter_Code: v,
                          Transporter_Name: transporter?.Name || "",
                        }));
                        updateTab({ isSaved: false });
                      }}
                      placeholder="Select Transporter"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                      Transporter Name
                    </label>
                    <Input
                      value={formState.Transporter_Name || ""}
                      onChange={(e) =>
                        handleChange("Transporter_Name", e.target.value)
                      }
                      className={cn(
                        "border-border h-10 focus:border-green-600/50",
                        !!formState.Transporter_Code && "bg-muted/20",
                      )}
                      disabled={!!formState.Transporter_Code}
                      placeholder="Enter Name"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-3">
            {postStep === 2 && (
              <Button
                variant="outline"
                onClick={() => setPostStep(1)}
                className="h-10 rounded-lg px-8"
              >
                Back
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setIsPostDialogOpen(false)}
              className="h-10 rounded-lg px-8"
            >
              Cancel
            </Button>
            <Button
              onClick={postStep === 1 ? handleNextStep : handlePost}
              disabled={isSubmitting}
              className="h-10 rounded-xl bg-green-600 px-10 font-bold text-white shadow-lg shadow-green-900/20 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : postStep === 1 ? (
                "Continue"
              ) : (
                "Post Order"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shipment Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent
          className={cn(
            "border-border bg-background rounded-3xl transition-[max-width] duration-300",
            reportDocuments.length > 0
              ? "sm:max-w-[95vw] lg:max-w-6xl"
              : "sm:max-w-md",
          )}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">
              {reportType === "shipment" ? "Shipment" : "Receipt"} Reports
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Directly viewing all {reportType}s for Transfer Order{" "}
              {formState.No}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {isReportLoading && reportDocuments.length === 0 && (
              <div className="flex flex-col items-center justify-center space-y-4 py-12">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
                <p className="text-muted-foreground animate-pulse text-sm">
                  Searching for {reportType}s...
                </p>
              </div>
            )}

            {reportDocuments.length > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-2 border-border bg-muted/10 overflow-x-auto rounded-2xl border duration-500">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                        No.
                      </TableHead>
                      <TableHead className="text-muted-foreground text-[11px] font-bold tracking-wider whitespace-nowrap uppercase">
                        Posting Date
                      </TableHead>
                      <TableHead className="text-muted-foreground text-[11px] font-bold tracking-wider whitespace-nowrap uppercase">
                        Vehicle No.
                      </TableHead>
                      {reportType === "shipment" && (
                        <>
                          <TableHead className="text-muted-foreground text-[11px] font-bold tracking-wider whitespace-nowrap uppercase">
                            E-way Bill
                          </TableHead>
                          <TableHead className="text-muted-foreground text-[11px] font-bold tracking-wider whitespace-nowrap uppercase">
                            E-Invoice
                          </TableHead>
                        </>
                      )}
                      <TableHead className="text-muted-foreground text-right text-[11px] font-bold tracking-wider uppercase">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportDocuments.map((s) => (
                      <TableRow
                        key={s.No}
                        className="border-border hover:bg-muted transition-colors"
                      >
                        <TableCell className="text-foreground text-xs font-bold">
                          {s.No}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                          {s.Posting_Date
                            ? new Date(s.Posting_Date).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                          {s.Vehicle_No || "-"}
                        </TableCell>
                        {reportType === "shipment" && (
                          <>
                            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                              {s.E_Way_Bill_No || "-"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                              {s.E_Invoice_No || "-"}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg transition-all active:scale-95"
                              onClick={() => handlePreviewReport(s.No)}
                              disabled={activeReportDocNo === s.No}
                            >
                              {activeReportDocNo === s.No ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                              <span className="ml-2 hidden sm:inline">
                                View
                              </span>
                            </Button>
                            {reportType === "shipment" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-primary/30 text-primary hover:bg-primary/5 h-8 rounded-lg transition-all active:scale-95"
                                onClick={() =>
                                  handlePrintRecord(
                                    "Transfer",
                                    s.No,
                                    "E-way Bill",
                                  )
                                }
                                disabled={activeReportDocNo === s.No}
                              >
                                <Printer className="h-3.5 w-3.5" />
                                <span className="ml-2 hidden sm:inline">
                                  Print E-way Bill
                                </span>
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg transition-all active:scale-95"
                              onClick={() => handleDownloadReport(s.No)}
                              disabled={activeReportDocNo === s.No}
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span className="ml-2 hidden sm:inline">
                                Download
                              </span>
                            </Button>
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary/90 h-8 rounded-lg text-white shadow-md transition-all active:scale-95"
                              onClick={() => handlePrintReport(s.No)}
                              disabled={activeReportDocNo === s.No}
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span className="ml-2 hidden sm:inline">
                                Print Report
                              </span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setIsReportDialogOpen(false)}
              className="h-10 rounded-xl px-8"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SuccessDialog
        open={successDialogOpen}
        onOpenChange={setSuccessDialogOpen}
        title={successInfo.title}
        message={successInfo.message}
        onClose={() => {
          // If we just posted, we might want to trigger the original handleSuccess
          if (successInfo.title.includes("Posted")) {
            handleSuccess();
          }
        }}
      />
    </div>
  );
}
