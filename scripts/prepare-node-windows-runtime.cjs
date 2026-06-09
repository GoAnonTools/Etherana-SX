const fs = require('fs');
const path = require('path');

if (process.platform !== 'win32') {
  console.error('Windows Node runtime must be prepared on Windows.');
  console.error('Run this on Windows or in GitHub Actions windows-latest.');
  process.exit(1);
}

const root = process.cwd();
const sourceNode = process.execPath;
const targetDir = path.join(root, 'desktop', 'node', 'windows');
const targetNode = path.join(targetDir, 'node.exe');

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(sourceNode, targetNode);
fs.chmodSync(targetNode, 0o755);

console.log('Windows Node runtime prepared:');
console.log(`  source: ${sourceNode}`);
console.log(`  target: ${targetNode}`);
