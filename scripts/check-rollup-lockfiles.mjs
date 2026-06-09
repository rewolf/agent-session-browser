#!/usr/bin/env node
/**
 * Fail fast when package-lock.json files are missing Rollup native optional deps.
 * Regenerating lockfiles on one OS drops other platforms (npm/cli#4828).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packages = ['core', 'cli', 'backend', 'frontend'];
const required = [
  'node_modules/@rollup/rollup-darwin-arm64',
  'node_modules/@rollup/rollup-win32-x64-msvc',
  'node_modules/@rollup/rollup-linux-x64-gnu',
];

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;

for (const pkg of packages) {
  const lockPath = join(root, 'packages', pkg, 'package-lock.json');
  const lock = readFileSync(lockPath, 'utf8');
  const missing = required.filter((entry) => !lock.includes(`"${entry}"`));

  if (missing.length > 0) {
    failed = true;
    console.error(`packages/${pkg}/package-lock.json is missing Rollup entries:`);
    for (const entry of missing) {
      console.error(`  - ${entry}`);
    }
  }
}

if (failed) {
  console.error(
    '\nRestore cross-platform @rollup/rollup-* entries before merging. See docs/technical/changes/rollup-lockfile-ci-fix.md',
  );
  process.exit(1);
}

console.log('Rollup optional dependency lockfile check passed.');
