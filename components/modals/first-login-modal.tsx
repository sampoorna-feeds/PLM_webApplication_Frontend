"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { resetPassword } from "@/lib/api/services/auth.service";
import { Loader2 } from "lucide-react";

interface FirstLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPassword: string) => void;
  userID: string;
  oldPassword: string;
}

export function FirstLoginModal({
  isOpen,
  onClose,
  onSuccess,
  userID,
  oldPassword,
}: FirstLoginModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 4) {
      setError("Password must be at least 4 characters long");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await resetPassword(userID, oldPassword, newPassword);
      setSuccessMessage(response.value || "Password updated successfully.");
    } catch (err) {
      console.error("Password reset error:", err);
      setError(err instanceof Error ? err.message : "Failed to reset password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (successMessage) {
      // If we had success, we should tell the parent to reset
      onSuccess(""); // Empty string or special value to indicate reset-to-login
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{successMessage ? "Success" : "Set New Password"}</DialogTitle>
          <DialogDescription>
            {successMessage 
              ? "Your password has been reset successfully."
              : "This is your first login. For security reasons, please set a new password for your account."
            }
          </DialogDescription>
        </DialogHeader>
        
        {successMessage ? (
          <div className="space-y-4 py-4">
            <div className="bg-primary/10 text-primary rounded-md p-3 text-center text-sm font-medium">
              {successMessage}
            </div>
            <Button onClick={handleClose} className="w-full">
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <FieldGroup className="py-4">
              <Field>
                <FieldLabel htmlFor="new-password">New Password</FieldLabel>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </Field>
              {error && (
                <p className="text-destructive text-sm font-medium">{error}</p>
              )}
            </FieldGroup>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
