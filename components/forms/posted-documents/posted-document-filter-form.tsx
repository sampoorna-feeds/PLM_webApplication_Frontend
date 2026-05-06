"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Search, RotateCcw, Calendar } from "lucide-react";

export interface DateRangeFilters {
  fromDate: string;
  toDate: string;
}

interface PostedDocumentFilterFormProps {
  onApply: (filters: DateRangeFilters) => void;
  title: string;
  description: string;
}

export function PostedDocumentFilterForm({ onApply, title, description }: PostedDocumentFilterFormProps) {
  const [filters, setFilters] = useState<DateRangeFilters>({
    fromDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    toDate: new Date().toISOString().split("T")[0],
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(filters);
  };

  const handleReset = () => {
    setFilters({
      fromDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
      toDate: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/20 bg-card/80 backdrop-blur-md animate-in fade-in zoom-in duration-300">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Calendar className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {title}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-2">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  From Date
                </label>
                <DateInput
                  value={filters.fromDate}
                  onChange={(val) => setFilters(prev => ({ ...prev, fromDate: val }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  To Date
                </label>
                <DateInput
                  value={filters.toDate}
                  onChange={(val) => setFilters(prev => ({ ...prev, toDate: val }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1 hover:bg-muted" 
                onClick={handleReset}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button type="submit" className="flex-1 shadow-md transition-all active:scale-95">
                <Search className="mr-2 h-4 w-4" />
                Show Records
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
