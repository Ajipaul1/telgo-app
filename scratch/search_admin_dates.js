const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'src', 'app', 'app', 'admin', 'page.tsx');
const content = fs.readFileSync(targetFile, 'utf8');

console.log("File length:", content.length);

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('Staged:') || line.includes('Submitted:') || line.includes('Invalid Date')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
