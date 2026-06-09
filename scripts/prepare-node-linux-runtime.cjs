const fs = require('fs');
const path = require('path');

const root = process.cwd();
const sourceNode = process.execPath;
const targetDir = path.join(root, 'desktop', 'node', 'linux');
const targetNode = path.join(targetDir, 'node');

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(sourceNode, targetNode);
fs.chmodSync(targetNode, 0o755);

console.log('Linux Node runtime prepared:');
console.log(`  source: ${sourceNode}`);
console.log(`  target: ${targetNode}`);
