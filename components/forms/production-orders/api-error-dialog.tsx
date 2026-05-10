import { ErrorDialog } from "@/components/ui/error-dialog";
import { cleanApiErrorMessage, extractApiError } from "@/lib/errors";
export { extractApiError };

export interface ApiErrorState {
  title: string;
  message: string;
  code?: string;
}

interface ApiErrorDialogProps {
  error: ApiErrorState | null;
  onClose: () => void;
}

export function ApiErrorDialog({ error, onClose }: ApiErrorDialogProps) {
  return (
    <ErrorDialog
      open={!!error}
      onOpenChange={(open) => !open && onClose()}
      title={error?.title || "Error"}
      message={error?.message || "An unexpected error occurred."}
      errors={error?.code ? [{ message: `Code: ${error.code}` }] : []}
      onClose={onClose}
    />
  );
}
