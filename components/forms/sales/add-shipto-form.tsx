/**
 * Add Ship-To Address Form
 * Form for creating and editing ship-to addresses
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldTitle } from '@/components/ui/field';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDownIcon, CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormStack } from '@/lib/form-stack/use-form-stack';
import {
  getShipToAddress,
  createShipToAddress,
  updateShipToAddress,
  createPinCode,
  type ShipToAddress,
  type ShipToAddressCreatePayload,
  type ShipToAddressUpdatePayload,
} from '@/lib/api/services/shipto.service';
import { getStates, type State } from '@/lib/api/services/state.service';
import { clearAddressCache } from '@/lib/validations/shipto.validation';
import { Loader2 } from 'lucide-react';

interface AddShipToFormProps {
  tabId: string;
  formData?: Record<string, any>;
  context?: Record<string, any>;
}

export function AddShipToForm({ tabId, formData: initialFormData, context }: AddShipToFormProps) {
  const { handleSuccess, closeTab } = useFormStack(tabId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [states, setStates] = useState<State[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState('');
  const [isStateOpen, setIsStateOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine if this is update mode
  const existingShipTo = initialFormData?.existingShipTo as ShipToAddress | undefined;
  const customerNo = initialFormData?.customerNo as string;
  const initialLocationCode = initialFormData?.locationCode as string | undefined;
  const isUpdateMode = !!existingShipTo;

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    address2: '',
    landmark: '',
    state: '',
    city: '',
    postCode: '',
    phoneNo: '',
    contact: '',
    email: '',
    locationCode: initialLocationCode || '', // Auto-populate from LOC in create mode
  });

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Load states on mount (only once)
  useEffect(() => {
    let isMounted = true;
    const loadStates = async () => {
      try {
        const statesList = await getStates();
        if (isMounted) {
          setStates(statesList);
        }
      } catch (error) {
        console.error('Error loading states:', error);
      }
    };
    loadStates();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Load data in update mode (only once)
  useEffect(() => {
    if (!isUpdateMode || !customerNo || !existingShipTo?.Code) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    
    const loadData = async () => {
      try {
        const latestData = await getShipToAddress(customerNo, existingShipTo.Code);
        if (isMounted && latestData) {
          setFormData({
            code: latestData.Code || '',
            name: latestData.Name || '',
            address: latestData.Address || '',
            address2: latestData.Address_2 || '',
            landmark: latestData.Landmark || '',
            state: latestData.State || '',
            city: latestData.City || '',
            postCode: latestData.Post_Code || '',
            phoneNo: latestData.Phone_No || '',
            contact: latestData.Contact || '',
            email: latestData.E_Mail || '',
            locationCode: latestData.Location_Code || '',
          });
        }
      } catch (error) {
        console.error('Error loading ship-to address:', error);
        // Fallback to existingShipTo if API fails
        if (isMounted && existingShipTo) {
          setFormData({
            code: existingShipTo.Code || '',
            name: existingShipTo.Name || '',
            address: existingShipTo.Address || '',
            address2: existingShipTo.Address_2 || '',
            landmark: existingShipTo.Landmark || '',
            state: existingShipTo.State || '',
            city: existingShipTo.City || '',
            postCode: existingShipTo.Post_Code || '',
            phoneNo: existingShipTo.Phone_No || '',
            contact: existingShipTo.Contact || '',
            email: existingShipTo.E_Mail || '',
            locationCode: existingShipTo.Location_Code || '',
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [isUpdateMode, customerNo, existingShipTo?.Code]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleStateChange = (value: string) => {
    setFormData((prev) => ({ ...prev, state: value, postCode: '' }));
    setIsStateOpen(false);
    setStateSearchQuery('');
  };

  // Filter states based on search query
  const filteredStates = stateSearchQuery.length > 0
    ? states.filter((state) => {
        const codeMatch = state.Code?.toLowerCase().includes(stateSearchQuery.toLowerCase());
        const nameMatch = state.Description?.toLowerCase().includes(stateSearchQuery.toLowerCase());
        return codeMatch || nameMatch;
      })
    : states;

  // Find selected state for display
  const selectedState = states.find((s) => s.Code === formData.state);

  const handleSubmit = async () => {
    if (!customerNo) {
      setError('Customer number is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isUpdateMode) {
        // Update existing address
        const updatePayload: ShipToAddressUpdatePayload = {
          Customer_No: customerNo,
          Code: formData.code,
          Name: formData.name,
          Address: formData.address || undefined,
          Address_2: formData.address2 || undefined,
          Landmark: formData.landmark || undefined,
          State: formData.state || undefined,
          City: formData.city || undefined,
          Post_Code: formData.postCode || undefined,
          Phone_No: formData.phoneNo || undefined,
          Contact: formData.contact || undefined,
          E_Mail: formData.email || undefined,
          Location_Code: formData.locationCode || undefined,
          Country_Region_Code: 'IN',
        };

        await updateShipToAddress(customerNo, formData.code, updatePayload);
      } else {
        // Create new address
        const createPayload: ShipToAddressCreatePayload = {
          Customer_No: customerNo,
          Code: formData.code,
          Name: formData.name,
          Address: formData.address || undefined,
          Address_2: formData.address2 || undefined,
          Landmark: formData.landmark || undefined,
          State: formData.state || undefined,
          City: formData.city || undefined,
          Post_Code: formData.postCode || undefined,
          Phone_No: formData.phoneNo || undefined,
          Contact: formData.contact || undefined,
          E_Mail: formData.email || undefined,
          Location_Code: formData.locationCode || undefined,
          Country_Region_Code: 'IN',
        };

        await createShipToAddress(createPayload);
      }

      // Clear address cache after successful create/update
      clearAddressCache(customerNo);

      // Fire-and-forget pincode creation (don't wait, don't block on errors)
      if (formData.postCode && formData.city) {
        // Fire and forget - don't await, don't catch errors here
        createPinCode(formData.postCode, formData.city).catch((err) => {
          // Silently log - this is non-blocking
          console.log('Pincode creation failed (non-blocking):', err);
        });
      }

      // Show success message with countdown
      setShowSuccess(true);
      setCountdown(5);
      
      // Clear any existing timers
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      
      // Countdown timer
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto-close after 5 seconds
      closeTimeoutRef.current = setTimeout(async () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        if (closeTimeoutRef.current) {
          closeTimeoutRef.current = null;
        }
        await handleSuccess();
      }, 5000);
    } catch (err: any) {
      console.error('Error saving ship-to address:', err);
      setError(err.message || 'Failed to save ship-to address. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {showSuccess && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-6 shadow-lg max-w-md mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">✅</div>
              <div className="text-green-800 dark:text-green-200 font-semibold text-lg mb-2">
                Success!
              </div>
              <div className="text-green-700 dark:text-green-300 text-sm mb-4">
                {isUpdateMode ? 'Ship-to address updated' : 'Ship-to address created'} successfully.
              </div>
              <div className="text-green-600 dark:text-green-400 text-xs">
                Closing automatically in {countdown} second{countdown !== 1 ? 's' : ''}...
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto px-6 py-6 ${showSuccess ? 'blur-sm pointer-events-none' : ''}`}>
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Code Field */}
          <div className="space-y-2">
            <FieldTitle>Code *</FieldTitle>
            <Input
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value)}
              placeholder="Enter code"
              disabled={isUpdateMode}
            />
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <FieldTitle>Name *</FieldTitle>
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter name"
            />
          </div>

          {/* Address Fields */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <FieldTitle>Address</FieldTitle>
              <Input
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter address"
              />
            </div>
            <div className="space-y-2">
              <FieldTitle>Address 2</FieldTitle>
              <Input
                value={formData.address2}
                onChange={(e) => handleInputChange('address2', e.target.value)}
                placeholder="Enter address line 2"
              />
            </div>
          </div>

          {/* Landmark Field */}
          <div className="space-y-2">
            <FieldTitle>Landmark *</FieldTitle>
            <Input
              value={formData.landmark}
              onChange={(e) => handleInputChange('landmark', e.target.value)}
              placeholder="Enter landmark"
            />
          </div>

          {/* State Field */}
          <div className="space-y-2">
            <FieldTitle>State *</FieldTitle>
            <Popover open={isStateOpen} onOpenChange={setIsStateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="h-9 text-sm w-full justify-between font-normal shadow-sm"
                >
                  <span className="truncate">
                    {selectedState ? selectedState.Description : 'Select state'}
                  </span>
                  <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 min-w-[280px] max-w-[400px] w-auto" align="start">
                <div className="p-2 border-b">
                  <Input
                    placeholder="Search state..."
                    value={stateSearchQuery}
                    onChange={(e) => setStateSearchQuery(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto overflow-x-hidden">
                  {filteredStates.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No states found
                    </div>
                  ) : (
                    filteredStates.map((state) => (
                      <div
                        key={state.Code}
                        className={cn(
                          'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-muted/50',
                          formData.state === state.Code && 'bg-muted'
                        )}
                        onClick={() => handleStateChange(state.Code)}
                      >
                        <CheckIcon
                          className={cn(
                            'mr-2 h-4 w-4 shrink-0',
                            formData.state === state.Code ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground">
                            {state.Description}
                          </div>
                          <div className="text-muted-foreground text-xs mt-0.5">
                            {state.Code}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Postcode and City Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <FieldTitle>Post Code *</FieldTitle>
              <Input
                type="text"
                inputMode="numeric"
                value={formData.postCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  handleInputChange('postCode', value);
                }}
                placeholder="Enter postcode"
              />
            </div>
            <div className="space-y-2">
              <FieldTitle>City {formData.postCode ? '*' : ''}</FieldTitle>
              <Input
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Enter city"
              />
            </div>
          </div>

          {/* Phone and Contact Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <FieldTitle>Phone No</FieldTitle>
              <Input
                type="text"
                inputMode="tel"
                value={formData.phoneNo}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  handleInputChange('phoneNo', value);
                }}
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <FieldTitle>Contact</FieldTitle>
              <Input
                value={formData.contact}
                onChange={(e) => handleInputChange('contact', e.target.value)}
                placeholder="Enter contact name"
              />
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <FieldTitle>E-Mail</FieldTitle>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email"
            />
          </div>

          {/* Location Code Field */}
          <div className="space-y-2">
            <FieldTitle>Location Code</FieldTitle>
            <Input
              value={formData.locationCode}
              onChange={(e) => handleInputChange('locationCode', e.target.value)}
              placeholder="Enter location code"
            />
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t flex gap-2">
        <Button
          variant="outline"
          onClick={() => closeTab()}
          className="flex-1"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isUpdateMode ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            isUpdateMode ? 'Update' : 'Create'
          )}
        </Button>
      </div>
    </div>
  );
}
