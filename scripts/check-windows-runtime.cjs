const fs = require('fs');
const path = require('path');

const root = process.cwd();

const required = [
  {
    label: 'Windows SearXNG runtime',
    path: path.join(root, 'desktop', 'searxng', 'windows', 'searxng.exe'),
  },
];

const missing = required.filter((item) => !fs.existsSync(item.path));

if (missing.length === 0) {
  console.log('Windows runtime prerequisites found.');
  process.exit(0);
}

console.error('Missing Windows runtime prerequisites:');

for (const item of missing) {
  console.error(`  - ${item.label}: ${path.relative(root, item.path)}`);
}

console.error('\nWindows standalone release requires a Windows SearXNG runtime.');
console.error('Build it later on Windows/GitHub Actions, then place it at:');
console.error('  desktop/searxng/windows/searxng.exe');

process.exit(1);
