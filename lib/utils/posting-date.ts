import { toast } from "sonner";
import type { WebUser } from "@/lib/api/services/web-user.service";

export function isPostingDateValid(
  date: string | undefined,
  webUserProfile: WebUser | null,
): boolean {
  if (!date) return false;
  if (!webUserProfile) return true;

  const postingDate = new Date(date);
  const from = webUserProfile.Allow_Posting_From?.split("T")[0];
  const to = webUserProfile.Allow_Posting_To?.split("T")[0];

  if (from && from !== "0001-01-01") {
    const fromDate = new Date(from);
    if (postingDate < fromDate) {
      toast.error(`Posting Date must be on or after ${fromDate.toLocaleDateString()}`);
      return false;
    }
  }

  if (to && to !== "0001-01-01") {
    const toDate = new Date(to);
    if (postingDate > toDate) {
      toast.error(`Posting Date must be on or before ${toDate.toLocaleDateString()}`);
      return false;
    }
  }

  return true;
}
