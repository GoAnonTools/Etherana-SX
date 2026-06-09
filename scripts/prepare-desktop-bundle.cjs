const fs = require('fs');
const path = require('path');

const root = process.cwd();

function copyIfExists(from, to) {
  if (!fs.existsSync(from)) return;

  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
}

copyIfExists(
  path.join(root, 'public'),
  path.join(root, '.next', 'standalone', 'public')
);

copyIfExists(
  path.join(root, '.next', 'static'),
  path.join(root, '.next', 'standalone', '.next', 'static')
);

console.log('Desktop bundle prepared.');


copyIfExists(
  path.join(root, 'drizzle'),
  path.join(root, '.next', 'standalone', 'drizzle')
);
