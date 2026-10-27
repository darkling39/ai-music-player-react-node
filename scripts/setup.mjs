// One-time setup after `npm install`: backend env file, database, Python transcriber.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = join(root, 'backend', '.env');

if (!existsSync(env)) {
  copyFileSync(join(root, 'backend', '.env.example'), env);
  console.log('Created backend/.env from .env.example');
}

for (const args of [['run', 'db:deploy', '-w', 'backend'], ['run', 'setup:asr']]) {
  const { status } = spawnSync(process.execPath, [process.env.npm_execpath, ...args], { stdio: 'inherit', cwd: root });
  if (status !== 0) process.exit(status ?? 1);
}
console.log('\nDone. Start everything with: npm run dev');
