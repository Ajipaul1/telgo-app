const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'src', 'app', 'app', 'supervisor', 'page.tsx');
const content = fs.readFileSync(targetFile, 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('/api/mobile/daily-reports') || line.includes('reportDate') && line.includes('body')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
