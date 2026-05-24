const fs = require('fs');
const path = require('path');
const targetFile = path.join(__dirname, 'src', 'app', 'app', 'supervisor', 'page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const startMarker = '      {isDailyReportOpen && (\r\n        <div style={{\r\n          position: "fixed",\r\n          inset: 0,\r\n          background: "rgba(6, 9, 18, 0.9)",\r\n          backdropFilter: "blur(14px)",\r\n          display: "flex",\r\n          alignItems: "center",\r\n          justifyContent: "center",\r\n          padding: "20px 10px",\r\n          zIndex: 1000,\r\n          fontFamily: "Outfit, sans-serif",\r\n          overflowY: "auto"\r\n        }}>';
const alternativeStartMarker = '      {isDailyReportOpen && (\n        <div style={{\n          position: "fixed",\n          inset: 0,\n          background: "rgba(6, 9, 18, 0.9)",\n          backdropFilter: "blur(14px)",\n          display: "flex",\n          alignItems: "center",\n          justifyContent: "center",\n          padding: "20px 10px",\n          zIndex: 1000,\n          fontFamily: "Outfit, sans-serif",\n          overflowY: "auto"\n        }}>';
const endMarker = '      {/* Account Settings Editor Modal */}';

let startIndex = content.indexOf(startMarker);
if (startIndex === -1) startIndex = content.indexOf(alternativeStartMarker);
if (startIndex === -1) { console.error("Could not find start marker"); process.exit(1); }

const endIndex = content.indexOf(endMarker, startIndex);
if (endIndex === -1) { console.error("Could not find end marker"); process.exit(1); }

const replacement = fs.readFileSync(path.join(__dirname, 'new_wizard.txt'), 'utf8');
const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(targetFile, newContent, 'utf8');
console.log("SUCCESS");
