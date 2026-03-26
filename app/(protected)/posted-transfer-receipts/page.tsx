"use client";

import { PostedTransferView } from "@/components/forms/posted-transfers/posted-transfer-view";
import { FormStackProvider } from "@/components/form-stack";

export default function PostedTransferReceiptsPage() {
  return (
    <FormStackProvider formScope="transfer">
      <div className="flex h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] w-full">
        <div className="flex min-w-0 flex-1 flex-col">
          <PostedTransferView type="receipt" />
        </div>
      </div>
    </FormStackProvider>
  );
}
