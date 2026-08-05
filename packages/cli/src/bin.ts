#!/usr/bin/env node
import { run } from './cli';

run().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
