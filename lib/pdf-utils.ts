/**
 * Utility functions for handling PDF generation and display
 */

/**
 * Converts a base64 string (optionally with data URI prefix) to a PDF Blob.
 * 
 * @param b64 - The base64 encoded PDF string
 * @returns A Blob object representing the PDF
 */
export function base64ToPdfBlob(b64: string): Blob {
  const normalized = b64
    .replace(/^data:application\/pdf;base64,/, "")
    .replace(/\s/g, "");
  
  try {
    const bytes = atob(normalized);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      arr[i] = bytes.charCodeAt(i);
    }
    return new Blob([arr], { type: "application/pdf" });
  } catch (error) {
    console.error("Failed to convert base64 to PDF blob:", error);
    throw new Error("Invalid PDF data format");
  }
}

/**
 * Opens a base64 encoded PDF in a new browser tab.
 * 
 * @param b64 - The base64 encoded PDF string
 * @param fileName - Optional filename for the document
 */
export function viewPdfFromBase64(b64: string, fileName?: string): void {
  if (!b64) {
    throw new Error("No PDF content provided");
  }
  
  const blob = base64ToPdfBlob(b64);
  const url = window.URL.createObjectURL(blob);
  
  // Open in new tab
  const newTab = window.open(url, "_blank", "noopener,noreferrer");
  
  if (!newTab) {
    // If popup blocked, fall back to download
    const link = document.createElement("a");
    link.href = url;
    if (fileName) {
      link.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  // Revoke object URL after some time to free memory
  setTimeout(() => window.URL.revokeObjectURL(url), 60000);
}
