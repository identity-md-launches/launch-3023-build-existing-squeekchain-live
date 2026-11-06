// Own the preview for the whole test process; always stop it when tests finish.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { server } from './serve.mjs';
const require = createRequire(import.meta.url);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const child = spawn(
  process.execPath,
  [require.resolve('@playwright/test/cli'), 'test', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYWRIGHT_EXTERNAL_SERVER: '1',
      PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${server.address().port}/preview/`,
    },
  },
);
const stop = () => child.kill('SIGTERM');
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
try {
  process.exitCode = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
} finally {
  process.off('SIGINT', stop);
  process.off('SIGTERM', stop);
  await new Promise((resolve) => server.close(resolve));
}
