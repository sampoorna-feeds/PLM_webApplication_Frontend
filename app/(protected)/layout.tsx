/**
 * Protected route layout
 * All routes inside (protected) require authentication
 * Includes sidebar navigation
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/layout/auth-guard";
import { AppSidebar } from "@/components/layout/sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, ChevronRight } from "lucide-react";
import { modules } from "@/lib/data/modules";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function HeaderSearch() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredModules = modules
    .map((category) => {
      const matchesCategory =
        category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchedSubItems = category.subItems.filter(
        (subItem) =>
          matchesCategory ||
          subItem.title.toLowerCase().includes(searchQuery.toLowerCase())
      );

      return {
        ...category,
        subItems: matchedSubItems,
      };
    })
    .filter((category) => category.subItems.length > 0);

  return (
    <div ref={containerRef} className="relative w-48 sm:w-60 mr-1.5">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-3.5 w-3.5" />
        <Input
          type="text"
          placeholder="Search modules..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="h-8 w-full pl-8 pr-2.5 text-xs rounded-[var(--radius)] bg-background/40"
        />
      </div>

      {isOpen && searchQuery !== "" && (
        <div className="absolute right-0 top-full mt-1.5 w-72 md:w-80 max-h-[320px] overflow-y-auto rounded-[var(--radius)] border bg-popover p-1.5 text-popover-foreground shadow-lg z-50 animate-in fade-in-50 slide-in-from-top-1 duration-150">
          {filteredModules.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              No results found
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {filteredModules.map((category) => (
                <div key={category.id} className="flex flex-col">
                  <div className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    {category.title}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {category.subItems.map((item) => (
                      <button
                        key={item.url}
                        onClick={() => {
                          router.push(item.url);
                          setIsOpen(false);
                          setSearchQuery("");
                        }}
                        className="w-full flex items-center justify-between rounded-[var(--radius)] px-2 py-1 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <item.icon className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{item.title}</span>
                        </div>
                        <ChevronRight className="h-3 w-3 text-zinc-400" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Generate breadcrumbs based on pathname
  const getBreadcrumbs = () => {
    if (pathname === "/voucher-form") {
      return [
        { label: "Forms", href: "#" },
        { label: "Voucher", href: null },
      ];
    }
    if (pathname === "/sales-form") {
      return [
        { label: "Forms", href: "#" },
        { label: "Sales", href: null },
      ];
    }
    if (pathname === "/sales/order") {
      return [
        { label: "Forms", href: "#" },
        { label: "Sales", href: "/sales/order" },
        { label: "Sales Order", href: null },
      ];
    }
    if (pathname === "/sales/invoice") {
      return [
        { label: "Forms", href: "#" },
        { label: "Sales", href: "/sales/order" },
        { label: "Sales Invoice", href: null },
      ];
    }
    if (pathname === "/sales/return-order") {
      return [
        { label: "Forms", href: "#" },
        { label: "Sales", href: "/sales/order" },
        { label: "Return Order", href: null },
      ];
    }
    if (pathname === "/sales/credit-memo") {
      return [
        { label: "Forms", href: "#" },
        { label: "Sales", href: "/sales/order" },
        { label: "Credit Memo", href: null },
      ];
    }
    if (pathname === "/purchase/order") {
      return [
        { label: "Forms", href: "#" },
        { label: "Purchase", href: "/purchase/order" },
        { label: "Purchase Order", href: null },
      ];
    }
    if (pathname === "/purchase/invoice") {
      return [
        { label: "Forms", href: "#" },
        { label: "Purchase", href: "/purchase/order" },
        { label: "Purchase Invoice", href: null },
      ];
    }
    if (pathname === "/purchase/return-order") {
      return [
        { label: "Forms", href: "#" },
        { label: "Purchase", href: "/purchase/order" },
        { label: "Return Order", href: null },
      ];
    }
    if (pathname === "/purchase/credit-memo") {
      return [
        { label: "Forms", href: "#" },
        { label: "Purchase", href: "/purchase/order" },
        { label: "Credit Memo", href: null },
      ];
    }
    if (pathname === "/production-orders") {
      return [
        { label: "Forms", href: "#" },
        { label: "Production Order", href: null },
      ];
    }
    if (pathname === "/ledger/report-ledger") {
      return [
        { label: "Ledger", href: "#" },
        { label: "Item Ledger", href: null },
      ];
    }
    if (pathname === "/ledger/vendor-ledger") {
      return [
        { label: "Ledger", href: "#" },
        { label: "Vendor Ledger", href: null },
      ];
    }
    if (pathname === "/ledger/consumption-report") {
      return [
        { label: "Ledger", href: "#" },
        { label: "Consumption Report", href: null },
      ];
    }
    if (pathname === "/ledger/stock-report") {
      return [
        { label: "Ledger", href: "#" },
        { label: "Stock Report", href: null },
      ];
    }
    if (pathname?.startsWith("/settings")) {
      if (pathname === "/settings/account") {
        return [
          { label: "Settings", href: "/settings" },
          { label: "Account", href: null },
        ];
      }
      if (pathname === "/settings/reset-password") {
        return [
          { label: "Settings", href: "/settings" },
          { label: "Reset Password", href: null },
        ];
      }
      return [{ label: "Settings", href: null }];
    }
    if (pathname === "/consume-inventory") {
      return [
        { label: "Forms", href: "#" },
        { label: "Consume Inventory", href: null },
      ];
    }
    // Add more routes as needed
    return [];
  };

  const breadcrumbs = getBreadcrumbs();

  // Back button: show on all pages except the dashboard itself
  const showBackButton = pathname !== "/";

  const backLabel = "Dashboard";
  const backHref = "/";

  return (
    <AuthGuard>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset className="h-svh max-h-svh overflow-hidden">
          <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4 bg-background/80 backdrop-blur-md z-40">
            <SidebarTrigger />
            {breadcrumbs.length > 0 && (
              <Breadcrumb>
                <BreadcrumbList className="text-[11px]">
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {crumb.href ? (
                          <BreadcrumbLink href={crumb.href} className="text-muted-foreground hover:text-foreground">
                            {crumb.label}
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage className="font-semibold text-foreground">{crumb.label}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            )}
            <div className="ml-auto flex items-center gap-2">
              {showBackButton && (
                <>
                  <HeaderSearch />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(backHref)}
                    className="gap-1.5 h-8 text-xs px-2.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>{backLabel}</span>
                  </Button>
                </>
              )}
              <ThemeToggle />
            </div>
          </header>
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
