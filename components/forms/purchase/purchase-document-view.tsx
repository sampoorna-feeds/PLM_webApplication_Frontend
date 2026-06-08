"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { getAllBranchesFromUserSetup } from "@/lib/api/services/dimension.service";
import { getPendingMRNReport } from "@/lib/api/services/purchase-orders.service";
import { getAuthCredentials } from "@/lib/auth/storage";
import { getWebUser, type WebUser } from "@/lib/api/services/web-user.service";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { PurchaseOrdersTable } from "@/components/forms/purchase/purchase-orders-table";
import { PurchaseOrderFilterBar } from "@/components/forms/purchase/purchase-order-filter-bar";
import { PurchaseOrderActiveFilters } from "@/components/forms/purchase/active-filters";
import {
  getPurchaseDocumentConfig,
  type PurchaseDocumentStatusTab,
  type PurchaseDocumentType,
} from "./purchase-document-config";
import { usePurchaseDocuments } from "./use-purchase-documents";

interface PurchaseDocumentViewProps {
  documentType: PurchaseDocumentType;
  statusFilter?: PurchaseDocumentStatusTab;
  onPlaceOrder?: () => void;
  registerRefetch?: (refetch: () => void) => void;
  poType?: string;
  onPoTypeChange?: (value: string) => void;
}

export function PurchaseDocumentView({
  documentType,
  statusFilter,
  onPlaceOrder,
  registerRefetch,
  poType: externalPoType,
  onPoTypeChange: externalOnPoTypeChange,
}: PurchaseDocumentViewProps) {
  const { openTab } = useFormStackContext();
  const config = getPurchaseDocumentConfig(documentType);
  const [webUserProfile, setWebUserProfile] = useState<WebUser | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isPendingMrnLoading, setIsPendingMrnLoading] = useState(false);

  const handleDownloadPendingMrnReport = async () => {
    const creds = getAuthCredentials();
    if (!creds?.userID) {
      toast.error("User session not found.");
      return;
    }
    
    setIsPendingMrnLoading(true);
    try {
      // Fetch branches
      const userBranches = await getAllBranchesFromUserSetup(creds.userID);
      const branchCodes = userBranches.map((b) => b.Code).filter(Boolean);
      
      if (branchCodes.length === 0) {
        toast.error("No authorized branches found for your user account.");
        setIsPendingMrnLoading(false);
        return;
      }
      
      const branchesStr = branchCodes.join("|");
      
      // Fetch report
      const base64 = await getPendingMRNReport({
        branch: branchesStr,
        userID: creds.userID,
      });

      if (!base64) {
        toast.error("No data received for the selected parameters.");
        setIsPendingMrnLoading(false);
        return;
      }

      // Convert and download
      const byteCharacters = atob(base64.replace(/\s/g, ""));
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `Pending_MRN_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Pending MRN Report downloaded successfully.");
    } catch (error: any) {
      console.error("Error downloading Pending MRN Report:", error);
      toastError(error, "Failed to download Pending MRN Report");
    } finally {
      setIsPendingMrnLoading(false);
    }
  };

  useEffect(() => {
    const creds = getAuthCredentials();
    if (creds?.userID) {
      setIsProfileLoading(true);
      getWebUser(creds.userID)
        .then(setWebUserProfile)
        .catch(console.error)
        .finally(() => setIsProfileLoading(false));
    } else {
      setIsProfileLoading(false);
    }
  }, []);

  const {
    orders,
    isLoading,
    refetch,
    pageSize,
    totalCount,
    sortColumn,
    sortDirection,
    searchQuery,
    columnFilters,
    additionalFilters,
    visibleColumns,
    allColumns,
    defaultColumns,
    optionalColumns,
    poType,
    onSort,
    onSearch,
    onColumnFilter,
    onColumnToggle,
    onResetColumns,
    onShowAllColumns,
    onAddAdditionalFilter,
    onRemoveAdditionalFilter,
    onPoTypeChange,
    onClearFilters,
    loadMore,
    hasMore,
    isLoadingMore,
  } = usePurchaseDocuments({ documentType, statusFilter, externalPoType, externalOnPoTypeChange });

  useEffect(() => {
    registerRefetch?.(refetch);
  }, [refetch, registerRefetch]);

  const handleCreateDocument = () => {
    openTab(config.formType, {
      title: config.createTabTitle,
      context: {
        documentType,
        mode: "create",
        openedFromParent: true,
        onOrderPlaced: onPlaceOrder,
      },
      autoCloseOnSuccess: true,
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <PurchaseOrderFilterBar
        searchQuery={searchQuery}
        visibleColumns={visibleColumns}
        allColumns={allColumns}
        defaultColumns={defaultColumns}
        optionalColumns={optionalColumns}
        columnFilters={columnFilters}
        additionalFilters={additionalFilters}
        onSearch={onSearch}
        onClearFilters={onClearFilters}
        onColumnToggle={onColumnToggle}
        onResetColumns={onResetColumns}
        onShowAllColumns={onShowAllColumns}
        onAddAdditionalFilter={onAddAdditionalFilter}
        onRemoveAdditionalFilter={onRemoveAdditionalFilter}
        poType={config.supportsPoTypeFilter ? poType : undefined}
        onPoTypeChange={
          config.supportsPoTypeFilter ? onPoTypeChange : undefined
        }
      >
        {documentType === "order" && (
          <Button
            variant="outline"
            onClick={handleDownloadPendingMrnReport}
            disabled={isPendingMrnLoading || isProfileLoading}
            size="sm"
            className="gap-2"
          >
            {isPendingMrnLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Pending MRN Report
          </Button>
        )}
        {!isProfileLoading && (documentType !== "order" || webUserProfile?.Access_Purchase_Order === "Edit") && (
          <Button onClick={handleCreateDocument} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {config.createButtonLabel}
          </Button>
        )}
        {isProfileLoading && (
          <Button disabled size="sm">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </Button>
        )}
      </PurchaseOrderFilterBar>

      <PurchaseOrderActiveFilters
        searchQuery={searchQuery}
        columnFilters={columnFilters}
        allColumns={allColumns}
        onSearch={onSearch}
        onColumnFilter={onColumnFilter}
        onClearFilters={onClearFilters}
      />

      <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
        <PurchaseOrdersTable
          orders={orders}
          isLoading={isLoading}
          visibleColumns={visibleColumns}
          allColumns={allColumns}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          pageSize={pageSize}
          currentPage={1}
          columnFilters={columnFilters}
          onRowClick={(orderNo, vendorName) => {
            const titleSuffix = vendorName ? ` - ${vendorName}` : "";
            openTab(config.formType, {
              title: `${config.detailTitlePrefix} ${orderNo}${titleSuffix}`,
              context: { documentType, mode: "view", orderNo, refetch, vendorName },
              autoCloseOnSuccess: false,
            });
          }}
          onSort={onSort}
          onColumnFilter={onColumnFilter}
          onLoadMore={loadMore}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
        />
      </div>
    </div>
  );
}
