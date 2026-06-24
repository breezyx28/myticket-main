#!/usr/bin/env node
import { execSync } from 'node:child_process';

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

function parseMessage(argv) {
  const mIdx = argv.indexOf('-m');
  if (mIdx !== -1) {
    const next = argv[mIdx + 1];
    if (next && !next.startsWith('-')) return next;
    console.error('Error: -m requires a commit message.');
    process.exit(1);
  }
  const positional = argv.filter((a) => !a.startsWith('-'));
  if (positional.length === 1) return positional[0];
  return process.env.DEPLOY_MESSAGE?.trim() || '';
}

const message = parseMessage(process.argv.slice(2));
if (!message) {
  console.error('Usage: npm run deploy -- -m "your commit message"');
  console.error('   or: npm run deploy -- "your commit message"');
  process.exit(1);
}

const dirty =
  execSync('git status --porcelain', { encoding: 'utf8' }).trim().length > 0;

if (dirty) {
  run('git add .');
  run(`git commit -m ${JSON.stringify(message)}`);
} else {
  console.log('No local changes — skipping add/commit.');
}

run('git push');
