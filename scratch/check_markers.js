const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'src', 'app', 'app', 'supervisor', 'page.tsx');
if (!fs.existsSync(targetFile)) {
  console.error("Target file does not exist at " + targetFile);
  process.exit(1);
}

const content = fs.readFileSync(targetFile, 'utf8');
console.log("File size:", content.length);

const startMarker = '      {isDailyReportOpen && (\r\n        <div style={{\r\n          position: "fixed",\r\n          inset: 0,\r\n          background: "rgba(6, 9, 18, 0.9)",\r\n          backdropFilter: "blur(14px)",\r\n          display: "flex",\r\n          alignItems: "center",\r\n          justifyContent: "center",\r\n          padding: "20px 10px",\r\n          zIndex: 1000,\r\n          fontFamily: "Outfit, sans-serif",\r\n          overflowY: "auto"\r\n        }}>';

const alternativeStartMarker = '      {isDailyReportOpen && (\n        <div style={{\n          position: "fixed",\n          inset: 0,\n          background: "rgba(6, 9, 18, 0.9)",\n          backdropFilter: "blur(14px)",\n          display: "flex",\n          alignItems: "center",\n          justifyContent: "center",\n          padding: "20px 10px",\n          zIndex: 1000,\n          fontFamily: "Outfit, sans-serif",\n          overflowY: "auto"\n        }}>';

const endMarker = '      {/* Account Settings Editor Modal */}';

let idx = content.indexOf('isDailyReportOpen');
console.log("isDailyReportOpen occurrences:", content.split('isDailyReportOpen').length - 1);
while (idx !== -1) {
  console.log("Occurrence of isDailyReportOpen at index:", idx);
  // print surrounding lines
  const start = Math.max(0, idx - 100);
  const end = Math.min(content.length, idx + 300);
  console.log("--- Surrounding content ---");
  console.log(content.substring(start, end));
  console.log("---------------------------");
  idx = content.indexOf('isDailyReportOpen', idx + 1);
}

console.log("startMarker index:", content.indexOf(startMarker));
console.log("alternativeStartMarker index:", content.indexOf(alternativeStartMarker));
console.log("endMarker index:", content.indexOf(endMarker));
