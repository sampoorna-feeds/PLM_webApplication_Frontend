const fs = require('fs');
const path = require('path');

const url = "https://api.sampoornafeeds.in:2028/BCtest/ODataV4/$metadata";
const username = "JobQueue";
const password = "India@12good";

async function main() {
  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  console.log("Fetching metadata from:", url);
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
      }
    });
    if (!res.ok) {
      console.error("HTTP error:", res.status, res.statusText);
      return;
    }
    const text = await res.text();
    console.log("Metadata length:", text.length);
    
    // Search for API_InitiateDownloadFile or similar Action/Function definitions
    const regex = /API_InitiateDownloadFile\w*/g;
    const matches = text.match(regex);
    console.log("Matches:", matches ? Array.from(new Set(matches)) : "None");

    // Search for any other InitiateDownload or InitiateUpload functions
    const uploadRegex = /API_InitiateUploadFile\w*/g;
    const uploadMatches = text.match(uploadRegex);
    console.log("Upload Matches:", uploadMatches ? Array.from(new Set(uploadMatches)) : "None");
    
    // Find all Actions/Functions containing Download
    const allDownloadRegex = /<Action\s+Name="([^"]*Download[^"]*)"|<Function\s+Name="([^"]*Download[^"]*)"/gi;
    let match;
    const downloads = [];
    while ((match = allDownloadRegex.exec(text)) !== null) {
      downloads.push(match[1] || match[2]);
    }
    console.log("All Download Actions/Functions:", Array.from(new Set(downloads)));
    
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
