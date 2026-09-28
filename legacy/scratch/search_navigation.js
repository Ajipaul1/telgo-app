const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'src', 'app', 'app', 'admin', 'page.tsx');
const content = fs.readFileSync(targetFile, 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('setActiveView') || line.includes('activeView ===')) {
    if (line.includes('button') || line.includes('onClick') || line.includes('div')) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  }
});
