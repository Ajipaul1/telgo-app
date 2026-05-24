const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'src', 'app', 'app', 'admin', 'page.tsx');
const content = fs.readFileSync(targetFile, 'utf8');

const lines = content.split('\n');
let level = 0;
let foundStart = -1;
let foundEnd = -1;

lines.forEach((line, idx) => {
  if (line.includes('activeView === "projects"') && line.includes('{')) {
    foundStart = idx;
  }
  if (foundStart !== -1 && idx > foundStart) {
    if (line.includes('activeView === "reports"')) {
      foundEnd = idx;
      foundStart = -1;
    }
  }
});

console.log("Start line of projects view:", foundStart);
console.log("End line / start of next view (reports):", foundEnd);

if (foundEnd !== -1) {
  // print surrounding lines
  for (let i = foundEnd - 10; i < foundEnd + 10; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
