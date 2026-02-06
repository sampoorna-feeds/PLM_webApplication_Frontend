/**
 * Login page - login-02 style
 * Two column layout with banner
 */

"use client";

import { useState, Suspense } from "react";
import { PublicGuard } from "@/components/layout/public-guard";
import { LoginForm } from "@/components/forms/login-form";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import Image from "next/image";

function LoginContent() {
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  return (
    <PublicGuard>
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex items-center justify-between">
            <a href="#" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Sampoorna Feeds Logo"
                width={56}
                height={56}
                priority
              />
              <div className="grid text-left text-sm leading-tight">
                <span className="text-lg font-semibold">Sampoorna Feeds</span>
                <span className="text-muted-foreground text-xs">
                  Feed... as it should be
                </span>
              </div>
            </a>
            <ThemeToggle />
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xs space-y-4">
              {!showForgotPassword ? (
                <>
                  <LoginForm />
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-muted-foreground hover:text-foreground text-sm underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </>
              ) : (
                <ForgotPasswordForm
                  onSuccess={() => setShowForgotPassword(false)}
                  onCancel={() => setShowForgotPassword(false)}
                />
              )}
            </div>
          </div>
        </div>
        <div className="bg-muted relative hidden lg:block">
          <Image
            src="/banner.jpg"
            alt="Sampoorna Feeds"
            fill
            className="object-cover dark:brightness-[0.6] dark:grayscale-[0.3]"
            priority
          />
        </div>
      </div>
    </PublicGuard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
