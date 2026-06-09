const fs = require('fs');
const path = require('path');

const root = process.cwd();

const candidates = [
  path.join(root, 'desktop', 'searxng', 'windows', 'searxng.exe'),
  path.join(root, 'desktop', 'searxng', 'windows', 'searxng.cmd'),
];

if (candidates.some((candidate) => fs.existsSync(candidate))) {
  console.log('Windows SearXNG launcher found.');
  process.exit(0);
}

console.error('Missing Windows runtime prerequisites:');
console.error('  - Windows SearXNG launcher: desktop/searxng/windows/searxng.exe or searxng.cmd');

console.error('\nWindows standalone release requires a Windows SearXNG runtime.');
console.error('Build it later on Windows/GitHub Actions.');

process.exit(1);
