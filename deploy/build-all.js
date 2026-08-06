#!/usr/bin/env node
// Cross-platform full build. `pnpm -r run build` builds every workspace package
// in topological (dependency-first) order, so @wavegrid/layout builds before the
// UI that imports it, and the UI builds before it is served by @wavegrid/server.
// No filters → no shell-quoting pitfalls on Windows CMD.

const { execSync } = require('child_process');

execSync('pnpm -r run build', { stdio: 'inherit' });
