/**
 * Utility functions for handling file downloads and conversions
 */

/**
 * Converts a base64 string to a Blob.
 * 
 * @param b64 - The base64 encoded string
 * @param mimeType - The MIME type of the file
 * @returns A Blob object representing the file
 */
export function base64ToBlob(b64: string, mimeType: string): Blob {
  const normalized = b64
    .replace(/^data:.*?;base64,/, "")
    .replace(/\s/g, "");
  
  try {
    const bytes = atob(normalized);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      arr[i] = bytes.charCodeAt(i);
    }
    return new Blob([arr], { type: mimeType });
  } catch (error) {
    console.error("Failed to convert base64 to blob:", error);
    throw new Error("Invalid file data format");
  }
}

/**
 * Downloads a file from a base64 encoded string.
 * 
 * @param b64 - The base64 encoded string
 * @param fileName - The name of the file to be downloaded
 * @param mimeType - The MIME type of the file
 */
export function downloadFileFromBase64(b64: string, fileName: string, mimeType: string): void {
  if (!b64) {
    throw new Error("No file content provided");
  }
  
  const blob = base64ToBlob(b64, mimeType);
  const url = window.URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Revoke object URL after some time to free memory
  setTimeout(() => window.URL.revokeObjectURL(url), 60000);
}

/**
 * Specifically handles Excel file downloads from base64
 */
export function downloadExcelFromBase64(b64: string, fileName: string): void {
  const excelMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const name = fileName.toLowerCase().endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  downloadFileFromBase64(b64, name, excelMimeType);
}
