"use client";

import { useRef, useState } from "react";
import {
  FormStackProvider,
  FormStackPanel,
  MiniAccessPanel,
} from "@/components/form-stack";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getSalesDocumentConfig,
  type SalesDocumentStatusTab,
  type SalesDocumentType,
} from "./sales-document-config";
import { SalesDocumentView } from "./sales-document-view";

type SalesTab = "open" | "pending" | "approved" | "all";

const TAB_STATUS_MAP: Record<SalesTab, SalesDocumentStatusTab> = {
  open: "Open",
  pending: "Pending Approval",
  approved: "Released",
  all: "",
};

interface SalesDocumentPageProps {
  documentType: SalesDocumentType;
}

function SalesDocumentPageContent({ documentType }: SalesDocumentPageProps) {
  const refetchRef = useRef<(() => void) | null>(null);
  const [activeTab, setActiveTab] = useState<SalesTab>("all");
  const config = getSalesDocumentConfig(documentType);

  return (
    <div className="flex h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] w-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(tab) => setActiveTab(tab as SalesTab)}
          className="flex h-full w-full flex-1 flex-col"
        >
          <div className="flex shrink-0 flex-col px-4 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {config.listTitle}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {config.listDescription}
                </p>
              </div>
              <TabsList className="grid w-fit grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent
            value="open"
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3"
          >
            <SalesDocumentView
              documentType={documentType}
              statusFilter={TAB_STATUS_MAP.open}
              onPlaceOrder={() => refetchRef.current?.()}
              registerRefetch={(refetch) => {
                refetchRef.current = refetch;
              }}
            />
          </TabsContent>

          <TabsContent
            value="pending"
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3"
          >
            <SalesDocumentView
              documentType={documentType}
              statusFilter={TAB_STATUS_MAP.pending}
              onPlaceOrder={() => refetchRef.current?.()}
              registerRefetch={(refetch) => {
                refetchRef.current = refetch;
              }}
            />
          </TabsContent>

          <TabsContent
            value="approved"
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3"
          >
            <SalesDocumentView
              documentType={documentType}
              statusFilter={TAB_STATUS_MAP.approved}
              onPlaceOrder={() => refetchRef.current?.()}
              registerRefetch={(refetch) => {
                refetchRef.current = refetch;
              }}
            />
          </TabsContent>

          <TabsContent
            value="all"
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3"
          >
            <SalesDocumentView
              documentType={documentType}
              statusFilter={TAB_STATUS_MAP.all}
              onPlaceOrder={() => refetchRef.current?.()}
              registerRefetch={(refetch) => {
                refetchRef.current = refetch;
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      <FormStackPanel />
      <MiniAccessPanel />
    </div>
  );
}

export function SalesDocumentPage({ documentType }: SalesDocumentPageProps) {
  return (
    <FormStackProvider formScope="sales">
      <SalesDocumentPageContent documentType={documentType} />
    </FormStackProvider>
  );
}
