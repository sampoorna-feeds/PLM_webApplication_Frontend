import { redirect } from "next/navigation";

/**
 * Legacy sales form route - redirects to Sales Order page
 */
export default function SalesFormPage() {
  redirect("/sales/order");
}
