const fs = require('fs');
const path = require('path');

const root = process.cwd();
const launcher = path.join(root, 'desktop', 'searxng', 'macos', 'searxng');

if (fs.existsSync(launcher)) {
  console.log('macOS SearXNG launcher found.');
  process.exit(0);
}

console.error('Missing macOS runtime prerequisites:');
console.error('  - macOS SearXNG launcher: desktop/searxng/macos/searxng');
process.exit(1);
