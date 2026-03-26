"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldTitle } from "@/components/ui/field";
import { DateInput } from "@/components/ui/date-input";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { getTransferLocationCodes } from "@/lib/api/services/transfer-orders.service";
import { Search, RotateCcw } from "lucide-react";
import { useEffect } from "react";

export interface PostedTransferFilters {
  postingDate?: string;
  fromLocation?: string;
  toLocation?: string;
}

interface PostedTransferFilterFormProps {
  onApply: (filters: PostedTransferFilters) => void;
  title: string;
  description: string;
}

export function PostedTransferFilterForm({ onApply, title, description }: PostedTransferFilterFormProps) {
  const [filters, setFilters] = useState<PostedTransferFilters>({
    postingDate: new Date().toISOString().split("T")[0],
  });
  
  const [locationOptions, setLocationOptions] = useState<SearchableSelectOption[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  useEffect(() => {
    const loadLocations = async () => {
      setIsLoadingLocations(true);
      try {
        const items = await getTransferLocationCodes();
        setLocationOptions(items.map(l => ({ value: l.Code, label: `${l.Code} - ${l.Name || ''}` })));
      } catch (error) {
        console.error("Error loading locations:", error);
      } finally {
        setIsLoadingLocations(false);
      }
    };
    loadLocations();
  }, []);

  const handleSearchLocations = async (search: string) => {
    if (search.length < 2) return;
    setIsLoadingLocations(true);
    try {
      const items = await getTransferLocationCodes(search);
      setLocationOptions(items.map(l => ({ value: l.Code, label: `${l.Code} - ${l.Name || ''}` })));
    } catch (error) {
      console.error("Error searching locations:", error);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(filters);
  };

  const handleReset = () => {
    setFilters({
      postingDate: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Field>
              <FieldTitle>Posting Date</FieldTitle>
              <DateInput
                value={filters.postingDate}
                onChange={(val) => setFilters(prev => ({ ...prev, postingDate: val }))}
              />
            </Field>

            <Field>

              <FieldTitle>Transfer From Location</FieldTitle>
              <SearchableSelect
                placeholder="Select From Location"
                options={locationOptions}
                isLoading={isLoadingLocations}
                onSearch={handleSearchLocations}
                value={filters.fromLocation}
                onValueChange={(val: string) => setFilters(prev => ({ ...prev, fromLocation: val }))}
              />
            </Field>

            <Field>
              <FieldTitle>Transfer To Location</FieldTitle>
              <SearchableSelect
                placeholder="Select To Location"
                options={locationOptions}
                isLoading={isLoadingLocations}
                onSearch={handleSearchLocations}
                value={filters.toLocation}
                onValueChange={(val: string) => setFilters(prev => ({ ...prev, toLocation: val }))}
              />
            </Field>


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
