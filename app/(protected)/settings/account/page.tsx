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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/contexts/auth-context";
import { User, Mail, Shield, Calendar } from "lucide-react";

export default function AccountPage() {
  const { userID, username } = useAuth();

  const userInitials = username
    ? username.substring(0, 2).toUpperCase()
    : userID
      ? userID.substring(0, 2).toUpperCase()
      : "U";

  return (
    <div className="flex max-w-4xl flex-1 flex-col space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Account</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Summary</CardTitle>
          <CardDescription>Your basic account information</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col items-center gap-6 py-4 md:flex-row md:items-start">
            <Avatar className="h-24 w-24 border-2 border-primary/10">
              <AvatarImage src="" alt={username || "User"} />
              <AvatarFallback className="text-2xl font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div className="grid gap-1">
                <h3 className="text-xl font-semibold leading-none">
                  {username || "User"}
                </h3>
                <p className="text-muted-foreground text-sm">
                  User ID: {userID || "N/A"}
                </p>
              </div>

              <div className="grid gap-3 pt-2">
                <div className="flex items-center gap-3 text-sm">
                  <User className="text-muted-foreground h-4 w-4" />
                  <span>Full Name: {username || "N/A"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="text-muted-foreground h-4 w-4" />
                  <span>Role: Administrator</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Manage your security settings and password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm italic">
            Security features are managed by your organization. Contact your IT
            administrator for changes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
