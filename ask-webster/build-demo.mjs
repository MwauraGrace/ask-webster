import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const frontend = new URL('../ask-webster-frontend/', import.meta.url);
const result = spawnSync(process.execPath, [fileURLToPath(new URL('node_modules/vite/bin/vite.js', frontend)), 'build', '--mode', 'demo'], {
  cwd: fileURLToPath(frontend), stdio: 'inherit', env: { ...process.env, VITE_API_URL: '/api/chat' },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
