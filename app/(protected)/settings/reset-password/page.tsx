"use client";

/**
 * Reset Password Page
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="flex max-w-4xl h-full max-h-full w-full flex-col space-y-6 p-6 overflow-y-auto">
      <div>
        <h1 className="text-3xl font-bold">Reset Password</h1>
        <p className="text-muted-foreground mt-2">
          Change your password to keep your account secure
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
