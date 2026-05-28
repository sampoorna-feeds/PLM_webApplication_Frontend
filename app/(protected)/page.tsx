"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { modules } from "@/lib/data/modules";
import { Search, Calendar, Clock, Settings, ChevronRight, LayoutGrid } from "lucide-react";

export default function DashboardPage() {
  const { username } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [greeting, setGreeting] = useState("Welcome");
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    // Client-side initialization to avoid hydration mismatch
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    const updateTime = () => {
      const now = new Date();
      setCurrentDate(
        now.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
      setCurrentTime(
        now.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter modules and subitems in real-time
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
    <div className="flex h-[calc(100vh-3rem)] max-h-[calc(100vh-3rem)] w-full flex-col overflow-y-auto bg-linear-to-b from-zinc-50/50 via-background to-background dark:from-zinc-950/20 dark:via-background dark:to-background px-6 py-6">
      
      {/* Sleek Observable Hero Header */}
      <div className="relative mb-5 overflow-hidden rounded-[var(--radius)] border border-primary/20 bg-linear-to-r from-emerald-500/10 via-primary/5 to-transparent dark:from-emerald-500/15 dark:via-primary/5 dark:to-transparent px-6 py-6 md:py-8 flex items-center text-foreground shadow-xs">
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-5 text-muted-foreground">
          <LayoutGrid className="h-48 w-48" />
        </div>
        
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between w-full z-10">
          <div className="flex flex-col justify-center">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{greeting},</span> 
              <span className="text-primary font-extrabold">{username ? username.toUpperCase() : "GUEST"}</span>
            </h1>
            <p className="mt-1 text-muted-foreground text-[14px] md:text-[14px]">
              Product Lifecycle Management Portal | Sampoorna Feeds
            </p>
          </div>
          
          <div className="flex flex-col gap-0.5 rounded-[var(--radius)] bg-background/50 border border-border/50 p-2.5 text-foreground md:text-right">
            <div className="flex items-center gap-1.5 text-[14px] font-semibold md:justify-end">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{currentDate}</span>
            </div>
            {currentTime && (
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground md:justify-end">
                <Clock className="h-3.5 w-3.5" />
                <span>{currentTime}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Control Panel (Search & Quick Links) */}
      <div className="mb-5 grid gap-4 md:grid-cols-3">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="text-muted-foreground absolute top-3 left-3.5 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search modules, forms, reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full pl-9 pr-3 text-[14px] bg-background/30 rounded-[var(--radius)] border border-border focus-visible:ring-primary/30"
          />
        </div>

        {/* Settings shortcut */}
        <div className="flex items-center gap-3">
          <Link href="/settings/account" className="w-full">
            <button className="flex h-10 w-full items-center justify-center gap-1.5 rounded-[var(--radius)] border border-border bg-background hover:bg-muted/40 px-3 text-[14px] font-medium transition-all shadow-xs">
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Account Settings</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="pb-6">
        <h2 className="mb-4 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
          {searchQuery !== "" ? `Search Results (${filteredModules.length})` : "System Modules & Components"}
        </h2>
        
        {filteredModules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-[var(--radius)] p-6 bg-zinc-50/20 dark:bg-zinc-800/10">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-[16px] font-semibold">No modules found</h3>
            <p className="text-muted-foreground text-[13px] mt-1">
              Try adjusting your search term for "sales", "purchase", "gate", etc.
            </p>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 max-w-full">
            {filteredModules.map((category) => {
              const activeSubItems = category.subItems.filter(item => !item.isPosted);
              const postedSubItems = category.subItems.filter(item => item.isPosted);
              const Icon = category.icon;

              return (
                <Card
                  key={category.id}
                  className={`flex flex-col justify-between overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:border-primary/60 focus-within:border-primary/60 transition-all duration-300 bg-card/75 backdrop-blur-md border border-border/80 ${category.colorClass}`}
                >
                  <CardHeader className="p-3 pb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius)] ${category.badgeColor}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <CardTitle className="text-[16px] font-semibold tracking-tight leading-tight">
                        {category.title}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-[13px] leading-relaxed line-clamp-2 mt-1.5 text-muted-foreground">
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="p-3 pt-1 flex-1 flex flex-col gap-2.5">
                    
                    {/* Active Operations List */}
                    {activeSubItems.length > 0 && (
                      <div className="flex flex-col">
                        {category.id !== "ledger" && (
                          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                            Operations & Forms
                          </div>
                        )}
                        <div className="flex flex-col gap-0.5">
                          {activeSubItems.map((item) => (
                            <Link
                              key={item.url}
                              href={item.url}
                              className="group flex items-center justify-between rounded-[var(--radius-sm)] p-1 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                            >
                              <div className="flex items-center gap-2 text-[14px] text-foreground/80">
                                <item.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                <span className="font-semibold group-hover:text-primary transition-colors">
                                  {item.title}
                                </span>
                              </div>
                              <ChevronRight className="h-3 w-3 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Posted / History Records List */}
                    {postedSubItems.length > 0 && (
                      <div className="flex flex-col mt-1">
                        <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                          Records & Posting History
                        </div>
                        <div className="flex flex-col gap-0.5">
                          {postedSubItems.map((item) => (
                            <Link
                              key={item.url}
                              href={item.url}
                              className="group flex items-center justify-between rounded-[var(--radius-sm)] p-1 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                            >
                              <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                                <item.icon className="h-3.5 w-3.5 text-muted-foreground/70 group-hover:text-primary transition-colors" />
                                <span className="font-semibold group-hover:text-primary transition-colors">
                                  {item.title}
                                </span>
                              </div>
                              <ChevronRight className="h-3 w-3 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
