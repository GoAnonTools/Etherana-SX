if (process.platform === 'win32') {
  process.exit(0);
}

console.error('Windows desktop release must be built on Windows.');
console.error('Use GitHub Actions windows-latest, or run this on a Windows machine.');
process.exit(1);
