"use client";

/**
 * Settings Page
 * Redirects to account page by default
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to account page by default
    router.replace("/settings/account");
  }, [router]);

  return null;
}
