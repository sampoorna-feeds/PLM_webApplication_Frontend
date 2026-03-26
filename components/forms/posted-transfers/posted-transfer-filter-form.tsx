"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldTitle } from "@/components/ui/field";
import { DateInput } from "@/components/ui/date-input";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { getTransferLocationCodes } from "@/lib/api/services/transfer-orders.service";
import { Search, RotateCcw } from "lucide-react";
import { useEffect, useCallback } from "react";
import { getAuthCredentials } from "@/lib/auth/storage";
import { getAllLOCsFromUserSetup } from "@/lib/api/services/dimension.service";
import { getTransferAllLocationCodes } from "@/lib/api/services/transfer-orders.service";

export interface PostedTransferFilters {
  fromDate?: string;
  toDate?: string;
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
    fromDate: new Date().toISOString().split("T")[0],
    toDate: new Date().toISOString().split("T")[0],
  });
  
  const [fromLocationOptions, setFromLocationOptions] = useState<SearchableSelectOption[]>([]);
  const [toLocationOptions, setToLocationOptions] = useState<SearchableSelectOption[]>([]);
  const [isLoadingFrom, setIsLoadingFrom] = useState(false);
  const [isLoadingTo, setIsLoadingTo] = useState(false);

  useEffect(() => {
    const loadInitialLocations = async () => {
      const credentials = getAuthCredentials();
      const userId = credentials?.userID;
      
      setIsLoadingFrom(true);
      setIsLoadingTo(true);
      
      try {
        // Load To Locations (all)
        const allLocs = await getTransferAllLocationCodes();
        setToLocationOptions(allLocs.map(l => ({ value: l.Code, label: `${l.Code} - ${l.Name || ''}` })));
        
        // Load From Locations (authorized only)
        if (userId) {
          const authLOCEntries = await getAllLOCsFromUserSetup(userId);
          const authCodes = authLOCEntries.map(l => l.Code).filter(Boolean);
          if (authCodes.length > 0) {
            const authLocs = await getTransferAllLocationCodes(authCodes);
            setFromLocationOptions(authLocs.map(l => ({ value: l.Code, label: `${l.Code} - ${l.Name || ''}` })));
          } else {
            // If no authorized codes, show nothing for From
            setFromLocationOptions([]);
          }
        } else {
          setFromLocationOptions([]);
        }
      } catch (error) {
        console.error("Error loading initial locations:", error);
      } finally {
        setIsLoadingFrom(false);
        setIsLoadingTo(false);
      }
    };
    loadInitialLocations();
  }, []);

  const handleSearchFromLocations = async (search: string) => {
    if (search.length < 1) return;
    setIsLoadingFrom(true);
    try {
      const credentials = getAuthCredentials();
      const userId = credentials?.userID;
      if (userId) {
         const authLOCEntries = await getAllLOCsFromUserSetup(userId);
         const authCodes = authLOCEntries.map(l => l.Code).filter(Boolean);
         const items = await getTransferAllLocationCodes(authCodes, search);
         setFromLocationOptions(items.map(l => ({ value: l.Code, label: `${l.Code} - ${l.Name || ''}` })));
      }
    } catch (error) {
      console.error("Error searching from locations:", error);
    } finally {
      setIsLoadingFrom(false);
    }
  };

  const handleSearchToLocations = async (search: string) => {
    if (search.length < 1) return;
    setIsLoadingTo(true);
    try {
      const items = await getTransferAllLocationCodes(undefined, search);
      setToLocationOptions(items.map(l => ({ value: l.Code, label: `${l.Code} - ${l.Name || ''}` })));
    } catch (error) {
      console.error("Error searching to locations:", error);
    } finally {
      setIsLoadingTo(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(filters);
  };

  const handleReset = () => {
    setFilters({
      fromDate: new Date().toISOString().split("T")[0],
      toDate: new Date().toISOString().split("T")[0],
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

            <Field>
              <FieldTitle>Transfer From Location</FieldTitle>
              <SearchableSelect
                placeholder="Select From Location"
                options={fromLocationOptions}
                isLoading={isLoadingFrom}
                onSearch={handleSearchFromLocations}
                value={filters.fromLocation}
                onValueChange={(val: string) => setFilters(prev => ({ ...prev, fromLocation: val }))}
              />
            </Field>

            <Field>
              <FieldTitle>Transfer To Location</FieldTitle>
              <SearchableSelect
                placeholder="Select To Location"
                options={toLocationOptions}
                isLoading={isLoadingTo}
                onSearch={handleSearchToLocations}
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
