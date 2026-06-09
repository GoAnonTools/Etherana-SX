const fs = require('fs');
const path = require('path');

if (process.platform !== 'darwin') {
  console.error('macOS Node runtime must be prepared on macOS.');
  console.error('Run this on GitHub Actions macos-latest or on a Mac.');
  process.exit(1);
}

const root = process.cwd();
const sourceNode = process.execPath;
const targetDir = path.join(root, 'desktop', 'node', 'macos');
const targetNode = path.join(targetDir, 'node');

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(sourceNode, targetNode);
fs.chmodSync(targetNode, 0o755);

console.log('macOS Node runtime prepared:');
console.log(`  source: ${sourceNode}`);
console.log(`  target: ${targetNode}`);
