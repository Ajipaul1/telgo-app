const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'src', 'app', 'app', 'admin', 'page.tsx');
const content = fs.readFileSync(targetFile, 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('useEffect') && lines[idx+1] && lines[idx+1].includes('editingProjectItem')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
    for (let i = 1; i <= 25; i++) {
      console.log(`  ${idx + i + 1}: ${lines[idx + i]}`);
    }
  }
});
