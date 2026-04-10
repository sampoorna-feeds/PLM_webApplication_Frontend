const fs = require('fs');
const p = 'lib/api/services/vendor-ledger.service.ts';
let code = fs.readFileSync(p, 'utf8');
if (!code.includes('applyVendorLedgerEntry')) {
  code += `\n/**\n * Apply vendor ledger entry to a document\n */\nexport async function applyVendorLedgerEntry(pONo: string, vendLedEntry: number): Promise<unknown> {\n  const endpoint = \`/API_SetVendApplId?company='\${encodeURIComponent(COMPANY)}'\`;\n  return apiPost<unknown>(endpoint, {\n    pONo,\n    vendLedEntry,\n    currentRec: false,\n  });\n}\n`;
  fs.writeFileSync(p, code);
  console.log("Added apply function");
} else {
  console.log("Already added");
}
