"use client";

/**
 * BrokerSelect component for Purchase Order forms
 * Dropdown with search for selecting a Broker (Vendor with Broker=true)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, ChevronsUpDown, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getBrokers,
  searchBrokers,
  type Broker,
} from "@/lib/api/services/vendor.service";

interface BrokerSelectProps {
  value: string;
  onChange: (value: string, broker?: Broker) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;

export function BrokerSelect({
  value,
  onChange,
  placeholder = "Select broker",
  disabled = false,
  className,
}: BrokerSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial brokers when dropdown opens
  const loadInitialBrokers = useCallback(async () => {
    if (hasLoadedInitial) return;
    setIsLoading(true);
    try {
      const data = await getBrokers();
      setBrokers(data);
      setHasLoadedInitial(true);
    } catch (error) {
      console.error("Error loading brokers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [hasLoadedInitial]);

  // Debounced search
  useEffect(() => {
    if (!open) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchQuery.length < MIN_SEARCH_LENGTH) {
      // Reset to initial list
      if (hasLoadedInitial) {
        getBrokers()
          .then((data) => setBrokers(data))
          .catch(console.error);
      }
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchBrokers(searchQuery);
        setBrokers(results);
      } catch (error) {
        console.error("Error searching brokers:", error);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, open, hasLoadedInitial]);

  const handleOpenChange = (newOpen: boolean) => {
    if (disabled) return;
    setOpen(newOpen);
    if (newOpen) {
      loadInitialBrokers();
    } else {
      setSearchQuery("");
    }
  };

  const selectedBroker = brokers.find((b) => b.No === value);
  const displayText = selectedBroker
    ? `${selectedBroker.No} - ${selectedBroker.Name}`
    : disabled && value
      ? "None"
      : value || placeholder;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={`h-9 w-full justify-between font-normal ${className || ""}`}
        >
          <span className="truncate text-left">
            {value ? displayText : disabled ? "None" : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search brokers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="max-h-50 overflow-y-auto">
          {isLoading ? (
            <div className="text-muted-foreground py-4 text-center text-sm">
              Loading...
            </div>
          ) : brokers.length === 0 ? (
            <div className="text-muted-foreground py-4 text-center text-sm">
              No brokers found
            </div>
          ) : (
            brokers.map((broker) => (
              <button
                key={broker.No}
                onClick={() => {
                  onChange(broker.No, broker);
                  setOpen(false);
                  setSearchQuery("");
                }}
                className={`hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  value === broker.No ? "bg-accent" : ""
                }`}
              >
                <Check
                  className={`h-4 w-4 ${value === broker.No ? "opacity-100" : "opacity-0"}`}
                />
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{broker.No}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {broker.Name}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
