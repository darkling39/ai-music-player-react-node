// Cross-platform helper for the Python sidecar: `node scripts/transcriber.mjs setup|run`.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'transcriber');
const venvPython = join(dir, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');

function run(cmd, args) {
  const { status } = spawnSync(cmd, args, { stdio: 'inherit', cwd: dir });
  if (status !== 0) process.exit(status ?? 1);
}

const command = process.argv[2];
if (command === 'setup') {
  const base = process.env.PYTHON ?? (process.platform === 'win32' ? 'py' : 'python3');
  const baseArgs = process.env.PYTHON || process.platform !== 'win32' ? [] : ['-3.11'];
  if (!existsSync(venvPython)) run(base, [...baseArgs, '-m', 'venv', '.venv']);
  run(venvPython, ['-m', 'pip', 'install', '-r', 'requirements.txt']);
  run(venvPython, ['-m', 'pip', 'install', '--no-deps', 'basic-pitch==0.4.0']);
} else if (command === 'run') {
  if (!existsSync(venvPython)) {
    console.error('Transcriber is not set up. Run: npm run setup:asr');
    process.exit(1);
  }
  run(venvPython, ['main.py']);
} else {
  console.error('Usage: transcriber.mjs setup|run');
  process.exit(1);
}
