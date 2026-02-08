"use client";

/**
 * Account Settings Page
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AccountPage() {
  return (
    <div className="flex max-w-4xl flex-1 flex-col space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Account</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account information
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-muted-foreground py-8 text-center">
            <p className="text-sm">On the way</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
