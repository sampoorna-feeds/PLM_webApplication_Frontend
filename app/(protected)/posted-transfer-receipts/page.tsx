"use client";

import { PostedTransferView } from "@/components/forms/posted-transfers/posted-transfer-view";
import { FormStackProvider } from "@/components/form-stack";

export default function PostedTransferReceiptsPage() {
  return (
    <FormStackProvider formScope="transfer">
      <div className="flex h-full max-h-full w-full overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <PostedTransferView type="receipt" />
        </div>
      </div>
    </FormStackProvider>
  );
}
