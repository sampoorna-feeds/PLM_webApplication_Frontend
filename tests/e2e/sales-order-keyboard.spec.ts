import { test, expect, Page, Locator } from "@playwright/test";

test.describe("Sales Order Keyboard Navigation & Dropdown UX E2E Tests", () => {
  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    sharedPage = await browser.newPage();
    await performLogin(sharedPage);
  });

  test.afterAll(async () => {
    await sharedPage.close();
  });

  // Helper to authenticate
  async function performLogin(page: Page) {
    page.on("pageerror", (err) => {
      console.error("BROWSER EXCEPTION:", err.message, err.stack);
    });
    page.on("console", (msg) => {
      console.log(`BROWSER [${msg.type().toUpperCase()}]:`, msg.text());
    });

    await page.goto("/login");
    const usernameInput = page.locator("#username");
    await usernameInput.waitFor({ state: "visible", timeout: 45000 });
    await usernameInput.fill("jobqueue");
    
    const passwordInput = page.locator("#password");
    await passwordInput.fill("jobqueue");
    
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL("/", { timeout: 30000 });
  }

  test("Verify 1-by-1 keyboard navigation and layout spacing in dropdowns", async () => {
    const page = sharedPage;
    test.setTimeout(75000);

    // 1. Navigate to Sales Orders list
    await page.goto("/sales/order");
    await page.waitForLoadState("networkidle");

    // 2. Click "Place Order" to start a new order
    const placeOrderBtn = page.locator('button:has-text("Place Order")');
    await placeOrderBtn.waitFor({ state: "visible", timeout: 20000 });
    await placeOrderBtn.click();

    // 3. Select LOB if visible
    const lobColumn = page.locator('div').filter({ has: page.locator('> label:has-text("LOB")') }).first();
    const lobInput = lobColumn.locator('input');
    try {
      await lobInput.waitFor({ state: "visible", timeout: 8000 });
      console.log("LOB input is visible, clicking to open options...");
      await lobInput.click({ force: true });
      const lobOption = page.locator('#cascading-select-listbox [role="option"]').first();
      await lobOption.waitFor({ state: "visible", timeout: 15000 });
      await lobOption.click({ force: true });
      await expect(page.locator('#cascading-select-listbox')).not.toBeVisible({ timeout: 10000 });
    } catch (e) {
      console.log("LOB auto-selected or skipped.");
    }

    // 4. Select Branch if visible
    const branchColumn = page.locator('div').filter({ has: page.locator('> label:has-text("Branch")') }).first();
    const branchInput = branchColumn.locator('input');
    try {
      await branchInput.waitFor({ state: "visible", timeout: 8000 });
      console.log("Branch input is visible, clicking to open options...");
      await branchInput.click({ force: true });
      const branchOption = page.locator('#cascading-select-listbox [role="option"]').first();
      await branchOption.waitFor({ state: "visible", timeout: 15000 });
      await branchOption.click({ force: true });
      await expect(page.locator('#cascading-select-listbox')).not.toBeVisible({ timeout: 10000 });
    } catch (e) {
      console.log("Branch auto-selected or skipped.");
    }

    // 5. Select Location Code
    const locSelect = page.locator('div:has(> label:has-text("Location Code")) button').first();
    await locSelect.waitFor({ state: "visible", timeout: 15000 });
    await locSelect.click({ force: true });
    await expect(page.getByRole('dialog', { name: 'Select Location' }).locator('tbody svg.animate-spin')).not.toBeVisible({ timeout: 15000 });
    
    const locOption = page.getByRole('dialog', { name: 'Select Location' }).locator('tbody tr').first();
    await locOption.waitFor({ state: "visible", timeout: 15000 });
    await locOption.click({ force: true });
    await expect(page.getByRole('dialog', { name: 'Select Location' })).not.toBeVisible({ timeout: 10000 });

    // 6. Select Customer
    const customerCombo = page.locator('div:has(> label:has-text("Customer")) button').first();
    await customerCombo.waitFor({ state: "visible", timeout: 15000 });
    await customerCombo.click({ force: true });
    await expect(page.getByRole('dialog', { name: 'Select Customer' }).locator('text=Loading customers…')).not.toBeVisible({ timeout: 15000 });
    
    const firstCustomerRow = page.getByRole('dialog', { name: 'Select Customer' }).locator('tbody tr').first();
    await firstCustomerRow.waitFor({ state: "visible", timeout: 15000 });
    await firstCustomerRow.click({ force: true });
    await expect(page.getByRole('dialog', { name: 'Select Customer' })).not.toBeVisible({ timeout: 10000 });

    // 7. Select Sales Person if empty
    const salesPersonInput = page.locator('div:has(> label:has-text("Sales Person")) input').first();
    await salesPersonInput.waitFor({ state: "visible", timeout: 15000 });
    const currentSalesPersonVal = await salesPersonInput.inputValue();
    if (!currentSalesPersonVal) {
      await salesPersonInput.click({ force: true });
      const spOption = page.locator('div[role="option"]').first();
      await spOption.waitFor({ state: "visible", timeout: 5000 });
      await spOption.click({ force: true });
    }

    // 8. Create Sales Order
    const createHeaderBtn = page.locator('button:has-text("Create Sales Order")');
    await createHeaderBtn.waitFor({ state: "visible", timeout: 15000 });
    await createHeaderBtn.click();

    // 9. Add Line
    const addLineBtn = page.locator('button:has-text("Add Line")');
    await addLineBtn.waitFor({ state: "visible", timeout: 20000 });
    await expect(addLineBtn).toBeEnabled({ timeout: 20000 });
    await addLineBtn.click();

    // 10. Select Item
    const itemSelectInput = page.locator('input[placeholder="Select Item"]');
    await itemSelectInput.waitFor({ state: "visible", timeout: 10000 });
    await itemSelectInput.click();

    const firstItemRow = page.locator('table tbody tr[data-row-index="0"]').first();
    await firstItemRow.waitFor({ state: "visible", timeout: 15000 });
    await firstItemRow.click({ force: true });

    // Wait for pricing to load
    await page.waitForTimeout(1000);

    // Locate UOM, GST Group Code, and HSN/SAC Code dropdown triggers
    const uomColumn = page.locator('div.space-y-1').filter({ has: page.getByText(/^UOM$/) }).first();
    const uomCombo = uomColumn.locator('button[role="combobox"]');

    const gstColumn = page.locator('div.space-y-1').filter({ has: page.getByText(/^GST Group Code$/) }).first();
    const gstCombo = gstColumn.locator('button[role="combobox"]');

    const hsnColumn = page.locator('div.space-y-1').filter({ has: page.getByText(/^HSN\/SAC Code$/) }).first();
    const hsnCombo = hsnColumn.locator('button[role="combobox"]');

    await expect(uomCombo).toBeVisible();
    await expect(gstCombo).toBeVisible();
    await expect(hsnCombo).toBeVisible();

    // Verify UOM triggers correctly and we can close it (no-op since UOM has only 1 option 'KG')
    console.log("Verifying UOM dropdown trigger...");
    await uomCombo.click({ force: true });
    await page.waitForTimeout(150);
    await page.keyboard.press("Escape");

    // Verify GST Group Code 1-by-1 Keyboard Navigation (with showSearch = true)
    console.log("Verifying keyboard navigation on GST Group Code dropdown (Search active)...");
    await gstCombo.click({ force: true });
    await page.waitForTimeout(150);
    
    // Type "E" to filter options and focus the search input
    await page.keyboard.press("E");
    
    const gstOptions = page.locator('div[role="option"]');
    await expect(gstOptions.first()).toBeVisible({ timeout: 5000 });
    const gstCount = await gstOptions.count();
    console.log(`Filtered GST Group Code options count: ${gstCount}`);
    
    if (gstCount > 1) {
      // Navigate down and check focus exactly 1-by-1 (no skipping)
      await page.keyboard.press("ArrowDown");
      await expect(gstOptions.nth(0)).toHaveClass(/bg-accent/);

      await page.keyboard.press("ArrowDown");
      await expect(gstOptions.nth(1)).toHaveClass(/bg-accent/);

      if (gstCount > 2) {
        await page.keyboard.press("ArrowDown");
        await expect(gstOptions.nth(2)).toHaveClass(/bg-accent/);
        
        await page.keyboard.press("ArrowUp");
        await expect(gstOptions.nth(1)).toHaveClass(/bg-accent/);
      }

      await page.keyboard.press("Enter");
      await expect(gstOptions.first()).not.toBeVisible();
    } else {
      await page.keyboard.press("Enter");
    }

    // Check Clear Button and Dropdown Button Layout for GST Group Code
    // The clear button 'X' should be visible and clickable when a value is selected.
    const clearGstBtn = gstColumn.locator('button:has(svg.lucide-x)');
    await expect(clearGstBtn).toBeVisible({ timeout: 5000 });
    
    // Check that HSN/SAC Code dropdown is populated/enabled
    const hsnTextBeforeClear = await hsnCombo.textContent();
    console.log(`HSN before clearing GST Group Code: ${hsnTextBeforeClear}`);
    
    // Click the clear button for GST Group Code
    await clearGstBtn.click({ force: true });
    
    // Verify GST Group Code is cleared
    await expect(gstCombo).toHaveText(/Select GST Group.../);
    
    // Verify HSN/SAC Code is cleared and disabled when GST Group is cleared
    await expect(hsnCombo).toHaveText(/Select GST Group first/);
    await expect(hsnCombo).toBeDisabled();

    // Wait 1s for any debounced network calls / state re-renders to settle
    await page.waitForTimeout(1000);

    // Re-select GST Group Code using keyboard navigation to ensure stability
    await gstCombo.click({ force: true });
    await page.waitForTimeout(150);
    await page.keyboard.type("EXEMPT");
    await page.waitForTimeout(150);
    await expect(gstOptions.first()).toBeVisible({ timeout: 5000 });
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(gstOptions.first()).not.toBeVisible();

    // Re-select HSN/SAC Code with keyboard navigation (Search inactive)
    console.log("Verifying keyboard navigation on HSN/SAC Code dropdown (Search inactive)...");
    await hsnCombo.click({ force: true });
    await page.waitForTimeout(150);
    const hsnOptions = page.locator('div[role="option"]');
    await expect(hsnOptions.first()).toBeVisible({ timeout: 5000 });
    const hsnCount = await hsnOptions.count();
    console.log(`HSN options count: ${hsnCount}`);
    
    if (hsnCount > 1) {
      // Navigate down and check focus exactly 1-by-1
      await page.keyboard.press("ArrowDown");
      await expect(hsnOptions.nth(0)).toHaveClass(/bg-accent/);

      await page.keyboard.press("ArrowDown");
      await expect(hsnOptions.nth(1)).toHaveClass(/bg-accent/);

      if (hsnCount > 2) {
        await page.keyboard.press("ArrowDown");
        await expect(hsnOptions.nth(2)).toHaveClass(/bg-accent/);
        
        await page.keyboard.press("ArrowUp");
        await expect(hsnOptions.nth(1)).toHaveClass(/bg-accent/);
      }

      await page.keyboard.press("Enter");
      await expect(hsnOptions.first()).not.toBeVisible();
    } else {
      await page.keyboard.press("Enter");
    }

    // Fill line description
    const descriptionInput = page.locator('input[placeholder="Enter description"]');
    await descriptionInput.fill("E2E Sales Order Keyboard Test Line Item");

    // Fill line quantity
    const qtyInput = page.locator('input[placeholder="0.00"]').nth(0);
    await qtyInput.fill("5");

    // Fill line price
    const priceInput = page.locator('input[placeholder="0.00"]').nth(1);
    await priceInput.fill("120");

    // Focus the quantity input and press Enter to save
    await qtyInput.focus();
    await page.keyboard.press("Enter");

    // Ensure the dialog closes
    const dialogForm = page.locator('form:has-text("Add Line")');
    await expect(dialogForm).not.toBeVisible({ timeout: 15000 });

    // Confirm that the new line is added to the table
    const tableCell = page.locator('table tbody td:has-text("BRCBF001")').first();
    await expect(tableCell).toBeVisible({ timeout: 15000 });
  });
});
