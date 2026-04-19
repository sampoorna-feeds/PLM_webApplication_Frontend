"use client";

import {
  FormStackProvider,
  FormStackPanel,
  MiniAccessPanel,
} from "@/components/form-stack";
import { SalesPostedDocumentView } from "./sales-posted-document-view";
import {
  POSTED_DOCUMENT_CONFIGS,
  type SalesPostedDocumentType,
} from "./sales-posted-document-config";

interface SalesPostedDocumentPageProps {
  documentType: SalesPostedDocumentType;
}

function SalesPostedDocumentPageContent({
  documentType,
}: SalesPostedDocumentPageProps) {
  const config = POSTED_DOCUMENT_CONFIGS[documentType];

  return (
    <div className="flex h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] w-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-col px-4 pt-3 pb-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {config.listTitle}
          </h1>
          <p className="text-muted-foreground text-sm">{config.listDescription}</p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-3">
          <SalesPostedDocumentView documentType={documentType} />
        </div>
      </div>
      <FormStackPanel />
      <MiniAccessPanel />
    </div>
  );
}

export function SalesPostedDocumentPage({
  documentType,
}: SalesPostedDocumentPageProps) {
  return (
    <FormStackProvider formScope="sales">
      <SalesPostedDocumentPageContent documentType={documentType} />
    </FormStackProvider>
  );
}
