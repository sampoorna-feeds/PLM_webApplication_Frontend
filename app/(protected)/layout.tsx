/**
 * Protected route layout
 * All routes inside (protected) require authentication
 * Includes sidebar navigation
 */

'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/layout/auth-guard';
import { AppSidebar } from '@/components/layout/sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Generate breadcrumbs based on pathname
  const getBreadcrumbs = () => {
    if (pathname === '/voucher-form') {
      return [
        { label: 'Forms', href: '#' },
        { label: 'Voucher', href: null },
      ];
    }
    if (pathname === '/sales-form') {
      return [
        { label: 'Forms', href: '#' },
        { label: 'Sales', href: null },
      ];
    }
    if (pathname?.startsWith('/settings')) {
      if (pathname === '/settings/account') {
        return [
          { label: 'Settings', href: '/settings' },
          { label: 'Account', href: null },
        ];
      }
      if (pathname === '/settings/reset-password') {
        return [
          { label: 'Settings', href: '/settings' },
          { label: 'Reset Password', href: null },
        ];
      }
      return [
        { label: 'Settings', href: null },
      ];
    }
    // Add more routes as needed
    return [];
  };

  const breadcrumbs = getBreadcrumbs();
  
  // Check if we should show "Return to Dashboard" button
  // Show it on settings pages and other non-main pages
  const showReturnToDashboard = pathname !== '/voucher-form' && pathname !== '/sales-form' && pathname !== '/';

  return (
    <AuthGuard>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
            <SidebarTrigger />
            {breadcrumbs.length > 0 && (
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {crumb.href ? (
                          <BreadcrumbLink href={crumb.href}>
                            {crumb.label}
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            )}
            <div className="ml-auto flex items-center gap-2">
              {showReturnToDashboard && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/voucher-form')}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Return to Dashboard</span>
                </Button>
              )}
              <ThemeToggle />
            </div>
          </header>
          <div className="flex flex-1 flex-col min-h-0 w-full overflow-hidden">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}

