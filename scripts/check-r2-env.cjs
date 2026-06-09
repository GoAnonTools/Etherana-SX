const required = ['R2_ACCOUNT_ID', 'R2_BUCKET'];

const missing = required.filter((key) => !process.env[key]);

if (missing.length === 0) {
  process.exit(0);
}

console.error('Missing required R2 environment variables:');
for (const key of missing) {
  console.error(`  - ${key}`);
}

console.error('\nUse dry run like this:');
console.error('R2_DRY_RUN=1 R2_ACCOUNT_ID="..." R2_BUCKET="..." R2_PREFIX="linux" npm run desktop:release:linux:r2');

console.error('\nOr upload only after a local release:');
console.error('R2_ACCOUNT_ID="..." R2_BUCKET="..." R2_PREFIX="linux" npm run desktop:release:upload:r2');

process.exit(1);
