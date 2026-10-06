const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const envFiles = tracked.filter((path) =>
  /(^|\/)\.env(?:\..*)?$/.test(path) && !path.endsWith('/.env.example') && path !== '.env.example',
);
assert.deepEqual(envFiles, [], 'No se deben versionar archivos .env reales');

const paths = ['.env', '.env.production', 'backend/.env', 'frontend/.env.local', 'nested/app/.env.test'];
const ignored = execFileSync('git', ['check-ignore', '--no-index', '--stdin'], {
  input: paths.join('\n') + '\n',
  encoding: 'utf8',
}).trim().split('\n');
assert.deepEqual(ignored, paths, 'Los archivos .env deben quedar ignorados en cualquier directorio');
console.log('Protección de archivos .env verificada');
