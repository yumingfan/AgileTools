'use strict';

/**
 * 包裝 `next dev`，在 Next 印出 Local: 網址後多輸出一行「前端已就緒」。
 */
const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const printed = { done: false };
let buf = '';

function tryPrint() {
  if (printed.done) return;
  const m = buf.match(/Local:\s+(https?:\/\/\S+)/);
  if (!m) return;
  printed.done = true;
  let backendOrigin = process.env.NEXT_PUBLIC_WS_ORIGIN;
  if (!backendOrigin) backendOrigin = 'http://localhost:3004';
  let backendPort = 3004;
  try {
    backendPort = Number(new URL(backendOrigin).port || 3004);
  } catch {
    backendPort = 3004;
  }
  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('  開發環境：前後端埠號');
  console.log(
    `  後端:  http://localhost:${backendPort}  （WebSocket /planning-poker）`,
  );
  console.log(`  前端:  ${m[1]}`);
  console.log('══════════════════════════════════════════════════');
  console.log('');
}

function feed(chunk) {
  buf += chunk.toString();
  if (buf.length > 12000) buf = buf.slice(-12000);
  tryPrint();
}

const child = spawn('npx', ['next', 'dev', '-p', '3003'], {
  cwd: root,
  shell: true,
  env: process.env,
});

child.stdout.on('data', (d) => {
  process.stdout.write(d);
  feed(d);
});
child.stderr.on('data', (d) => {
  process.stderr.write(d);
  feed(d);
});
child.on('exit', (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});
