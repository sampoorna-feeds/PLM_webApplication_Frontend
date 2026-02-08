# Ship-To Address Form - API Calls Documentation

## Add Ship-To Form (Create Mode)

### APIs Called on Form Load:

1. **`getStates()`** - `GET /State?company='...'&$select=Code,Description,fromPin,toPin&$orderby=Description`
   - **Purpose**: Fetch list of states with postcode validation ranges
   - **When**: Once on component mount
   - **Caching**: Yes (module-level cache, prevents retries on error)
   - **Error Handling**: Returns empty array if API fails (form works without state validation)

### APIs Called During Validation:

2. **`getShipToAddresses(customerNo)`** - `GET /ShiptoAddress?company='...'&$filter=Customer_No eq '...'&$select=Code,Name,Location_Code&$orderby=Code`
   - **Purpose**: Validate code uniqueness (check if code already exists for customer)
   - **When**: Only when validating code field (on submit, not during typing)
   - **Caching**: Yes (30-second TTL cache per customer to prevent multiple calls)
   - **Error Handling**: Returns null (doesn't block validation, server will validate)

### APIs Called on Submit:

3. **`createShipToAddress(data)`** - `POST /ShiptoAddress?company='...'`
   - **Purpose**: Create new ship-to address
   - **When**: When user clicks "Create" button
   - **Payload**: All form fields in PascalCase format
   - **Error Handling**: Shows error message, doesn't proceed

4. **`createPinCode(code, city)`** - `POST /PinCode?company='...'`
   - **Purpose**: Create pincode entry (fire-and-forget)
   - **When**: After successful create, if postcode and city are provided
   - **Payload**: `{ Code: "...", City: "...", Country_Region_Code: "IN" }`
   - **Error Handling**: Logged but not shown to user (non-blocking)

---

## Edit Ship-To Form (Update Mode)

### APIs Called on Form Load:

1. **`getStates()`** - `GET /State?company='...'&$select=Code,Description,fromPin,toPin&$orderby=Description`
   - **Purpose**: Fetch list of states with postcode validation ranges
   - **When**: Once on component mount
   - **Caching**: Yes (module-level cache)

2. **`getShipToAddress(customerNo, code)`** - `GET /Company('...')/ShiptoAddress(Customer_No='...',Code='...')`
   - **Purpose**: Fetch latest ship-to address data to pre-fill form
   - **When**: Once on component mount (in update mode only)
   - **Error Handling**: Falls back to `existingShipTo` prop if API fails
   - **Note**: Only called once per code, tracked with `dataLoaded` flag

### APIs Called During Validation:

3. **`getShipToAddresses(customerNo)`** - `GET /ShiptoAddress?company='...'&$filter=Customer_No eq '...'&$select=Code,Name,Location_Code&$orderby=Code`
   - **Purpose**: Validate code uniqueness (excludes current code from check)
   - **When**: Only when validating code field (on submit)
   - **Caching**: Yes (30-second TTL cache per customer)

### APIs Called on Tab Refresh (FormStack):

4. **`getShipToAddress(customerNo, code)`** - `GET /Company('...')/ShiptoAddress(Customer_No='...',Code='...')`
   - **Purpose**: Refresh form data when user switches back to tab
   - **When**: Only when tab is revisited (via `registerRefresh` callback)
   - **Error Handling**: Logged but doesn't throw (form keeps existing data)

### APIs Called on Submit:

5. **`updateShipToAddress(customerNo, code, data)`** - `PATCH /Company('...')/ShiptoAddress(Customer_No='...',Code='...')`
   - **Purpose**: Update existing ship-to address
   - **When**: When user clicks "Update" button
   - **Headers**: `If-Match: *` (required for PATCH)
   - **Payload**: Only changed fields in PascalCase format
   - **Error Handling**: Shows error message, doesn't proceed

6. **`createPinCode(code, city)`** - `POST /PinCode?company='...'`
   - **Purpose**: Create pincode entry (fire-and-forget)
   - **When**: After successful update, if postcode and city are provided
   - **Error Handling**: Logged but not shown to user (non-blocking)

---

## Summary

### Total API Calls:

**Add Form (Create Mode):**

- On Load: 1 API call (`getStates`)
- On Validation: 0-1 API calls (`getShipToAddresses` - only on submit, cached)
- On Submit: 1-2 API calls (`createShipToAddress` + optional `createPinCode`)

**Edit Form (Update Mode):**

- On Load: 2 API calls (`getStates` + `getShipToAddress`)
- On Validation: 0-1 API calls (`getShipToAddresses` - only on submit, cached)
- On Tab Refresh: 0-1 API calls (`getShipToAddress` - only when revisiting tab)
- On Submit: 1-2 API calls (`updateShipToAddress` + optional `createPinCode`)

### Optimizations Applied:

1. **States API**: Module-level cache, prevents retries on error
2. **Address List API**: 30-second TTL cache per customer (prevents multiple calls during validation)
3. **Single Load Tracking**: Flags prevent re-loading same data multiple times
4. **Error Handling**: APIs fail gracefully without blocking user

### Notes:

- All APIs use Basic Auth from environment variables
- Company name is URL-encoded in all requests
- Pincode creation is fire-and-forget (doesn't block on error)
- Validation only runs on submit, not during typing (prevents excessive API calls)
