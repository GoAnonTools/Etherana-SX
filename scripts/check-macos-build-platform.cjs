if (process.platform === 'darwin') {
  process.exit(0);
}

console.error('macOS desktop release must be built on macOS.');
console.error('Use GitHub Actions macos-latest, or run this on a Mac.');
process.exit(1);
