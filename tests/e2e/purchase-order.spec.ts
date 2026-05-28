import { test, expect, Page } from "@playwright/test";

test.describe("Purchase Order E2E Tests", () => {
  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    sharedPage = await browser.newPage();
    await performLogin(sharedPage);
  });

  test.afterAll(async () => {
    await sharedPage.close();
  });

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

  /**
   * Opens a MasterSearchableSelect (shared/searchable-select.tsx) by clicking the
   * input and picks the first option once the async API load completes.
   *
   * IMPORTANT:
   * - Must use click({ force: true }) to bypass Playwright's actionability checks
   *   inside the modal Dialog (focus-trap prevents normal click flow).
   * - Must scope options to [data-radix-popper-content-wrapper] to avoid matching
   *   hidden [role="option"] elements left in the DOM by the closed Type <Select>.
   */
  async function selectFirstFromMasterSearchable(
    page: Page,
    input: ReturnType<typeof page.locator>,
  ): Promise<string> {
    // force: true required – modal dialog prevents actionability checks from passing
    await input.click({ force: true });

    // Options render inside the Radix PopoverContent portal once loadInitial() resolves.
    // Scoping to [data-radix-popper-content-wrapper] avoids false matches on hidden
    // [role="option"] elements from the now-closed Type shadcn Select.
    const firstOption = page
      .locator('[data-radix-popper-content-wrapper] [role="option"]')
      .first();
    await firstOption.waitFor({ state: "visible", timeout: 20000 });
    const optionText = await firstOption.innerText();
    await firstOption.click({ force: true });
    return optionText;
  }


  test("Purchase Order Header and Lines Lifecycle", async () => {
    const page = sharedPage;
    test.setTimeout(180000);

    // 1. Navigate to Purchase Orders list
    await page.goto("/purchase/order");
    await page.waitForLoadState("networkidle");

    // 2. Click "Place Order" to start a new purchase order
    const placeOrderBtn = page.locator('button:has-text("Place Order")');
    await placeOrderBtn.waitFor({ state: "visible", timeout: 20000 });
    await placeOrderBtn.click();

    // 3. Select LOB if visible
    try {
      const lobInput = page.locator("div").filter({ has: page.locator('> label:has-text("LOB")') }).first().locator("input");
      await lobInput.waitFor({ state: "visible", timeout: 8000 });
      console.log("LOB input is visible, clicking...");
      await lobInput.click({ force: true });
      const lobOption = page.locator('#cascading-select-listbox [role="option"]').first();
      await lobOption.waitFor({ state: "visible", timeout: 15000 });
      await lobOption.click({ force: true });
      await expect(page.locator('#cascading-select-listbox')).not.toBeVisible({ timeout: 10000 });
    } catch (e) {
      console.log("LOB auto-selected or skipped.");
    }

    // 4. Select Branch if visible
    try {
      const branchInput = page.locator("div").filter({ has: page.locator('> label:has-text("Branch")') }).first().locator("input");
      await branchInput.waitFor({ state: "visible", timeout: 8000 });
      console.log("Branch input is visible, clicking...");
      await branchInput.click({ force: true });
      const branchOption = page.locator('#cascading-select-listbox [role="option"]').first();
      await branchOption.waitFor({ state: "visible", timeout: 15000 });
      await branchOption.click({ force: true });
      await expect(page.locator('#cascading-select-listbox')).not.toBeVisible({ timeout: 10000 });
    } catch (e) {
      console.log("Branch auto-selected or skipped.");
    }

    // 5. Select Location Code
    const locBtn = page.locator('div:has(> label:has-text("Location Code")) button').first();
    await locBtn.waitFor({ state: "visible", timeout: 15000 });
    await locBtn.click({ force: true });
    const locDialog = page.getByRole("dialog", { name: "Select Location" });
    await expect(locDialog.locator("tbody svg.animate-spin")).not.toBeVisible({ timeout: 15000 });
    await locDialog.locator("tbody tr").first().click({ force: true });
    await expect(locDialog).not.toBeVisible({ timeout: 10000 });

    // 6. Select Vendor
    const vendorBtn = page.locator('div:has(> label:has-text("Vendor")) button').first();
    await vendorBtn.waitFor({ state: "visible", timeout: 15000 });
    await vendorBtn.click({ force: true });
    const vendorDialog = page.getByRole("dialog", { name: "Select Vendor" });
    await expect(vendorDialog.locator("tbody svg.animate-spin")).not.toBeVisible({ timeout: 15000 });
    await vendorDialog.locator("tbody tr").first().click({ force: true });
    await expect(vendorDialog).not.toBeVisible({ timeout: 10000 });

    // 7. Create Purchase Order
    const createHeaderBtn = page.locator('button:has-text("Create Purchase Order")');
    await createHeaderBtn.waitFor({ state: "visible", timeout: 15000 });
    await createHeaderBtn.click();

    // ── Shared helpers ──
    const addLineBtn = page.locator('button:has-text("Add Line")');
    await addLineBtn.waitFor({ state: "visible", timeout: 25000 });
    await expect(addLineBtn).toBeEnabled({ timeout: 25000 });

    const addLineDialog = page.getByRole("dialog", { name: "Add Line" });
    const descriptionInput = addLineDialog.locator('input[placeholder="Enter description"]');
    const submitBtn = addLineDialog.locator('button[type="submit"]');

    // ─────────────────────────────────────────────────────
    // 8. Add Line – Type: Item
    // ─────────────────────────────────────────────────────
    await addLineBtn.click();
    await expect(addLineDialog).toBeVisible({ timeout: 10000 });

    // Open item lookup modal
    const itemSelectBtn = addLineDialog.locator('button:has-text("Select Item")').first();
    await itemSelectBtn.click({ force: true });

    const selectItemDialog = page.getByRole("dialog", { name: "Select Item" });
    await expect(selectItemDialog.locator("tbody svg.animate-spin")).not.toBeVisible({ timeout: 15000 });
    const firstItemRow = selectItemDialog.locator("tbody tr").first();
    await firstItemRow.waitFor({ state: "visible", timeout: 15000 });
    // Capture item No from the "No." column (2nd column after Description/No)
    const itemNoCells = firstItemRow.locator("td");
    const itemNo = (await itemNoCells.nth(0).innerText()).trim();
    console.log(`Selecting item: ${itemNo}`);
    await firstItemRow.click({ force: true });
    await expect(selectItemDialog).not.toBeVisible({ timeout: 10000 });

    // Wait for async getItemByNo to finish – description will be non-empty
    await expect(descriptionInput).not.toHaveValue("", { timeout: 15000 });
    const itemDescription = (await descriptionInput.inputValue()).trim();
    console.log(`Item description: "${itemDescription}"`);

    // Fill Quantity and Unit Cost
    const qtyInput = addLineDialog.locator('input[placeholder="0.00"]').nth(0);
    await qtyInput.fill("10");
    const costInput = addLineDialog.locator('input[placeholder="0.00"]').nth(1);
    await costInput.fill("120");

    await submitBtn.click();
    await expect(addLineDialog).not.toBeVisible({ timeout: 15000 });

    // Verify Item row in lines table (look for any unique cell from this line)
    // Use item description to find row – it should be stable now since we waited for async
    const tableItemRow = page.locator('table tbody tr', {
      has: page.locator(`td:has-text("${itemDescription}")`),
    }).first();
    await expect(tableItemRow).toBeVisible({ timeout: 15000 });
    console.log("✅ Item line verified in table");

    // ─────────────────────────────────────────────────────
    // 9. Add Line – Type: G/L Account
    // ─────────────────────────────────────────────────────
    await addLineBtn.click();
    await expect(addLineDialog).toBeVisible({ timeout: 10000 });

    // Change line type to G/L Account
    const typeCombo = addLineDialog.locator('[role="combobox"]').first();
    await typeCombo.click();
    const glTypeOption = page.locator('[role="option"]:has-text("G/L Account")').first();
    await glTypeOption.waitFor({ state: "visible", timeout: 8000 });
    await glTypeOption.click();
    // Wait for Type Select portal to fully unmount before we look for GL Account options
    await expect(glTypeOption).not.toBeVisible({ timeout: 5000 });

    // Select GL Account from MasterSearchableSelect (async load)
    const glInput = addLineDialog.locator('input[placeholder="Select GL Account"]').first();
    await glInput.waitFor({ state: "visible", timeout: 10000 });
    await selectFirstFromMasterSearchable(page, glInput);

    // Wait for description to auto-populate
    await expect(descriptionInput).not.toHaveValue("", { timeout: 10000 });
    const glDescription = (await descriptionInput.inputValue()).trim();
    console.log(`GL Account description: "${glDescription}"`);

    await qtyInput.fill("1");
    await costInput.fill("500");

    await submitBtn.click();
    await expect(addLineDialog).not.toBeVisible({ timeout: 15000 });

    const tableGLRow = page.locator('table tbody tr', {
      has: page.locator(`td:has-text("${glDescription}")`),
    }).first();
    await expect(tableGLRow).toBeVisible({ timeout: 15000 });
    console.log("✅ G/L Account line verified in table");

    // ─────────────────────────────────────────────────────
    // 10. Add Line – Type: Fixed Asset
    // ─────────────────────────────────────────────────────
    await addLineBtn.click();
    await expect(addLineDialog).toBeVisible({ timeout: 10000 });

    await typeCombo.click();
    const faTypeOption = page.locator('[role="option"]:has-text("Fixed Asset")').first();
    await faTypeOption.waitFor({ state: "visible", timeout: 8000 });
    await faTypeOption.click();
    // Wait for Type Select portal to fully unmount
    await expect(faTypeOption).not.toBeVisible({ timeout: 5000 });

    const faInput = addLineDialog.locator('input[placeholder="Select Fixed Asset"]').first();
    await faInput.waitFor({ state: "visible", timeout: 10000 });
    await selectFirstFromMasterSearchable(page, faInput);

    await expect(descriptionInput).not.toHaveValue("", { timeout: 10000 });
    const faDescription = (await descriptionInput.inputValue()).trim();
    console.log(`Fixed Asset description: "${faDescription}"`);

    // FA Posting Type select
    const faPostingTypeCombo = addLineDialog.locator('[role="combobox"]').nth(1);
    await faPostingTypeCombo.waitFor({ state: "visible", timeout: 8000 });
    await faPostingTypeCombo.click();
    const acquisitionCostOption = page.locator('[role="option"]:has-text("Acquisition Cost")').first();
    await acquisitionCostOption.waitFor({ state: "visible", timeout: 8000 });
    await acquisitionCostOption.click();
    await expect(acquisitionCostOption).not.toBeVisible({ timeout: 5000 });

    await qtyInput.fill("1");
    await costInput.fill("1200");

    await submitBtn.click();
    await expect(addLineDialog).not.toBeVisible({ timeout: 15000 });

    const tableFARow = page.locator('table tbody tr', {
      has: page.locator(`td:has-text("${faDescription}")`),
    }).first();
    await expect(tableFARow).toBeVisible({ timeout: 15000 });
    console.log("✅ Fixed Asset line verified in table");

    // ─────────────────────────────────────────────────────
    // 11. Add Line – Type: Charge (Item)
    // ─────────────────────────────────────────────────────
    await addLineBtn.click();
    await expect(addLineDialog).toBeVisible({ timeout: 10000 });

    await typeCombo.click();
    const chargeTypeOption = page.locator('[role="option"]:has-text("Charge Item")').first();
    await chargeTypeOption.waitFor({ state: "visible", timeout: 8000 });
    await chargeTypeOption.click();
    // Wait for Type Select portal to fully unmount
    await expect(chargeTypeOption).not.toBeVisible({ timeout: 5000 });

    const chargeInput = addLineDialog.locator('input[placeholder="Select Charge Item"]').first();
    await chargeInput.waitFor({ state: "visible", timeout: 10000 });
    await selectFirstFromMasterSearchable(page, chargeInput);

    await expect(descriptionInput).not.toHaveValue("", { timeout: 10000 });
    const chargeDescription = (await descriptionInput.inputValue()).trim();
    console.log(`Charge Item description: "${chargeDescription}"`);

    await qtyInput.fill("1");
    await costInput.fill("150");

    await submitBtn.click();
    await expect(addLineDialog).not.toBeVisible({ timeout: 15000 });

    const tableChargeRow = page.locator('table tbody tr', {
      has: page.locator(`td:has-text("${chargeDescription}")`),
    }).first();
    await expect(tableChargeRow).toBeVisible({ timeout: 15000 });
    console.log("✅ Charge Item line verified in table");

    // ─────────────────────────────────────────────────────
    // 12. Edit Item line – update Quantity to 15
    // ─────────────────────────────────────────────────────
    // Click on the description cell of the item row to open edit dialog
    await tableItemRow.locator(`td:has-text("${itemDescription}")`).click();
    const editLineDialog = page.getByRole("dialog", { name: "Edit Purchase Line" });
    await expect(editLineDialog).toBeVisible({ timeout: 10000 });

    const editQtyInput = editLineDialog.locator("#po-line-qty");
    await editQtyInput.fill("15");

    const editSaveBtn = editLineDialog.locator('button[type="submit"]');
    await editSaveBtn.click();
    await expect(editLineDialog).not.toBeVisible({ timeout: 15000 });

    // Verify Qty updated to 15 in the item row
    await expect(tableItemRow.locator('td:has-text("15")')).toBeVisible({ timeout: 10000 });
    console.log("✅ Item quantity updated to 15");

    // ─────────────────────────────────────────────────────
    // 13. Delete Charge (Item) line
    // ─────────────────────────────────────────────────────
    await tableChargeRow.locator(`td:has-text("${chargeDescription}")`).click();
    await expect(editLineDialog).toBeVisible({ timeout: 10000 });

    const deleteBtn = editLineDialog.locator('button:has-text("Delete")');
    await deleteBtn.click();

    const confirmDialog = page.getByRole("dialog", { name: "Delete Line" });
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    await confirmDialog.locator('button:has-text("Delete")').click();

    await expect(tableChargeRow).not.toBeVisible({ timeout: 15000 });
    console.log("✅ Charge Item line deleted");
  });
});
