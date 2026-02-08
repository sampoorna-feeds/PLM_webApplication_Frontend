"use client";

/**
 * Sidebar component - sidebar-08 style
 * Inset sidebar with navigation, forms, support, and user avatar
 */

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/contexts/auth-context";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  FileText,
  LifeBuoy,
  Send,
  ChevronsUpDown,
  LogOut,
  User,
  KeyRound,
} from "lucide-react";

const formsItems = [
  {
    title: "Voucher",
    url: "/voucher-form",
    icon: FileText,
  },
  {
    title: "Sales",
    url: "/sales-form",
    icon: FileText,
  },
  {
    title: "Production Order",
    url: "/production-orders",
    icon: FileText,
  },
];

const settingsItems = [
  {
    title: "Account",
    url: "/settings/account",
    icon: User,
  },
  {
    title: "Reset Password",
    url: "/settings/reset-password",
    icon: KeyRound,
  },
];

const secondaryItems = [
  {
    title: "Support",
    url: "#",
    icon: LifeBuoy,
  },
  {
    title: "Feedback",
    url: "#",
    icon: Send,
  },
];

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof SidebarRoot>) {
  const router = useRouter();
  const pathname = usePathname();
  const { userID, username, logout: authLogout } = useAuth();
  const { clearAuth } = useAuthStore();
  const { isMobile } = useSidebar();

  const handleLogout = async () => {
    await authLogout();
    clearAuth();
    router.push("/login");
  };

  // Determine which navigation items to show
  const isSettingsPage =
    pathname?.startsWith("/settings") || pathname?.startsWith("/account");
  const navItems = isSettingsPage ? settingsItems : formsItems;
  const navLabel = isSettingsPage ? "Settings" : "Forms";

  return (
    <SidebarRoot variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-12 items-center justify-center overflow-hidden">
                  <Image
                    src="/logo.png"
                    alt="Sampoorna Feeds Logo"
                    width={48}
                    height={48}
                    priority
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Sampoorna Feeds</span>
                  <span className="text-muted-foreground truncate text-xs">
                    Feed... as it should be
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {!isSettingsPage && (
          <SidebarGroup>
            <SidebarGroupLabel>Forms</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {formsItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isSettingsPage && (
          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsItems.map((item) => {
                  const isActive = pathname === item.url;

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild size="sm" tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground w-full"
                >
                  <Avatar className="h-8 w-8 rounded-md! [&>img]:rounded-md!">
                    <AvatarFallback className="rounded-md!">
                      {username ? username.substring(0, 2).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {username || "User"}
                    </span>
                    <span className="text-muted-foreground truncate text-xs">
                      {userID || ""}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-md! [&>img]:rounded-md!">
                      <AvatarFallback className="rounded-md!">
                        {username
                          ? username.substring(0, 2).toUpperCase()
                          : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">
                        {username || "User"}
                      </span>
                      <span className="text-muted-foreground truncate text-xs">
                        {userID || ""}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/settings/account">
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarRoot>
  );
}
