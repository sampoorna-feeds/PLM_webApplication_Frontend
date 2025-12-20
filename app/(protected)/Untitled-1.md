Base URL = https://api.sampoornafeeds.in:2028/BCtest/ODataV4

1. G/L account
  a. Initial dropdown open (NO search, fast)
        👉 Load only 20 items, only required fields.

        https://api.sampoornafeeds.in:2028/BCtest/ODataV4/GLAccount
        ?company='Sampoorna Feeds Pvt. Ltd'
        &$select=No,Name
        &$filter=Account_Type eq 'Posting' and Direct_Posting eq true
        &$orderby=No
        &$top=20


        ⛔ Do NOT load everything. This is just to populate an empty dropdown.

  b. Search when user types (BEST approach)
        Trigger this only after 2–3 characters + debounce (300ms).

        Example: user types cash
        https://api.sampoornafeeds.in:2028/BCtest/ODataV4/GLAccount
        ?company='Sampoorna Feeds Pvt. Ltd'
        &$select=No,Name
        &$filter=Account_Type eq 'Posting'
        and Direct_Posting eq true
        and (startswith(No,'cash') or contains(Name,'cash'))
        &$orderby=No
        &$top=30


        👉 This is server-side search
        👉 Payload is tiny
        👉 Response is fast

  c. Infinite scroll / pagination (when user scrolls)
        Second page:

        &$top=30
        &$skip=30


        Third page:

        &$top=30
        &$skip=60


        Full example with search + paging:

        https://api.sampoornafeeds.in:2028/BCtest/ODataV4/GLAccount
        ?company='Sampoorna Feeds Pvt. Ltd'
        &$select=No,Name
        &$filter=Account_Type eq 'Posting'
        and Direct_Posting eq true
        and contains(Name,'cash')
        &$orderby=No
        &$top=30
        &$skip=30

  d. If performance is still slow (important)
        Use startswith instead of contains whenever possible:

        ✅ FAST:

        startswith(No,'101')


        ❌ SLOW:

        contains(Name,'101')



repet same for 
https://api.sampoornafeeds.in:2028/BCtest/ODataV4/VendorCard?company='Sampoorna Feeds Pvt. Ltd'&$select=No,Name&$Filter=Responsibility_Center in ('','FEED','CATTLE','SWINE') and Blocked eq ' '


https://api.sampoornafeeds.in:2028/BCtest/ODataV4/CustomerCard?company='Sampoorna Feeds Pvt. Ltd'&$select=No,Name&$Filter=Responsibility_Center in ('','FEED','CATTLE','SWINE') and Blocked eq ' '


UI rules you must follow (non-negotiable)

Debounce API calls (300–400ms)

Minimum 2–3 chars before search

Cancel previous request on new input

Cache results per query string