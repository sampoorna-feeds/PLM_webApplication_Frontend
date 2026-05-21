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
    <div className="flex h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] w-full flex-col overflow-y-auto bg-linear-to-b from-emerald-50/10 via-zinc-50/20 to-zinc-50/10 dark:from-emerald-950/5 dark:via-zinc-950 dark:to-zinc-900 px-6 py-8">
      
      <div className="relative mb-8 overflow-hidden rounded-2xl border bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-8 md:py-10 min-h-[160px] flex items-center text-white shadow-md dark:border-zinc-800">
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10">
          <LayoutGrid className="h-64 w-64" />
        </div>
        
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between w-full">
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              {greeting}, {username ? username.toUpperCase() : "GUEST"}!
            </h1>
            <p className="mt-2 text-emerald-100 font-medium text-sm md:text-base">
              Product Lifecycle Management Portal | Sampoorna Feeds
            </p>
          </div>
          
          <div className="flex flex-col gap-1 rounded-xl bg-white/10 backdrop-blur-xs p-4 text-emerald-50 md:text-right">
            <div className="flex items-center gap-2 text-sm font-semibold md:justify-end">
              <Calendar className="h-4 w-4" />
              <span>{currentDate}</span>
            </div>
            {currentTime && (
              <div className="flex items-center gap-2 text-xs opacity-90 md:justify-end">
                <Clock className="h-3 w-3" />
                <span>{currentTime}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Control Panel (Search & Quick Links) */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="text-muted-foreground absolute top-3.5 left-4 h-5 w-5" />
          <Input
            type="text"
            placeholder="Search modules, forms, reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 w-full pl-12 pr-4 bg-background/50 backdrop-blur-xs text-base rounded-xl border border-zinc-200 dark:border-zinc-800 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
          />
        </div>

        {/* Settings shortcut */}
        <div className="flex items-center gap-3">
          <Link href="/settings/account" className="w-full">
            <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background/50 hover:bg-background/80 px-4 text-sm font-medium transition-all shadow-xs">
              <Settings className="h-4 w-4 text-zinc-500" />
              <span>Account Settings</span>
            </button>
          </Link>
        </div>
      </div>



      {/* Modules Grid */}
      <div>
        <h2 className="mb-6 text-xs font-bold uppercase tracking-wider text-zinc-500">
          {searchQuery !== "" ? `Search Results (${filteredModules.length})` : "System Modules & Components"}
        </h2>
        
        {filteredModules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-zinc-100 dark:bg-zinc-800 p-4 mb-4">
              <Search className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-medium">No modules found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Try adjusting your search term for "sales", "purchase", "gate", etc.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredModules.map((category) => {
              const activeSubItems = category.subItems.filter(item => !item.isPosted);
              const postedSubItems = category.subItems.filter(item => item.isPosted);
              const Icon = category.icon;

              return (
                <Card
                  key={category.id}
                  className={`flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-background/40 backdrop-blur-xs ${category.colorClass}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${category.badgeColor}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base font-bold tracking-tight">
                        {category.title}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs line-clamp-2 mt-2">
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-2 flex-1">
                    <div className="flex flex-col gap-4">
                      
                      {/* Active Operations List */}
                      {activeSubItems.length > 0 && (
                        <div>
                          {category.id !== "ledger" && (
                            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                              Operations & Forms
                            </div>
                          )}
                          <div className="flex flex-col gap-1.5">
                            {activeSubItems.map((item) => (
                              <Link
                                key={item.url}
                                href={item.url}
                                className="group flex items-center justify-between rounded-lg p-2 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 transition-colors"
                              >
                                <div className="flex items-center gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
                                  <item.icon className="h-4 w-4 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                                  <span className="font-medium group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
                                    {item.title}
                                  </span>
                                </div>
                                <ChevronRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Posted / History Records List */}
                      {postedSubItems.length > 0 && (
                        <div>
                          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            Records & Posting History
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {postedSubItems.map((item) => (
                              <Link
                                key={item.url}
                                href={item.url}
                                className="group flex items-center justify-between rounded-lg p-2 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 transition-colors"
                              >
                                <div className="flex items-center gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                                  <item.icon className="h-4 w-4 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                                  <span className="font-medium group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
                                    {item.title}
                                  </span>
                                </div>
                                <ChevronRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                      
                    </div>
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
