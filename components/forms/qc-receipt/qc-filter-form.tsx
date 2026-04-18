"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldTitle } from "@/components/ui/field";
import { DateInput } from "@/components/ui/date-input";
import { Search, RotateCcw } from "lucide-react";

export interface QCDateFilters {
  fromDate: string;
  toDate: string;
}

interface QCFilterFormProps {
  onApply: (filters: QCDateFilters) => void;
  title: string;
  description: string;
}

export function QCFilterForm({ onApply, title, description }: QCFilterFormProps) {
  const [filters, setFilters] = useState<QCDateFilters>({
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
      <Card className="w-full max-w-md shadow-lg border-primary/20 bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldTitle>From Date</FieldTitle>
                <DateInput
                  value={filters.fromDate}
                  onChange={(val) => setFilters(prev => ({ ...prev, fromDate: val }))}
                />
              </Field>
              <Field>
                <FieldTitle>To Date</FieldTitle>
                <DateInput
                  value={filters.toDate}
                  onChange={(val) => setFilters(prev => ({ ...prev, toDate: val }))}
                />
              </Field>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button type="submit" className="flex-1">
                <Search className="mr-2 h-4 w-4" />
                Show Data
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
