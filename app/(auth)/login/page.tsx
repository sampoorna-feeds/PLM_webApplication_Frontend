/**
 * Login page - login-02 style
 * Two column layout with banner
 */

'use client';

import { PublicGuard } from '@/components/layout/public-guard';
import { LoginForm } from '@/components/forms/login-form';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import Image from 'next/image';

export default function LoginPage() {
  return (
    <PublicGuard>
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex justify-between items-center">
            <a href="#" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Sampoorna Feeds Logo"
                width={56}
                height={56}
                priority
              />
              <div className="grid text-left text-sm leading-tight">
                <span className="font-semibold text-lg">Sampoorna Feeds</span>
                <span className="text-xs text-muted-foreground">Feed... as it should be</span>
              </div>
            </a>
            <ThemeToggle />
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xs">
              <LoginForm />
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
