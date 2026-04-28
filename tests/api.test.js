const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = path.join(__dirname, '..');
const dbPath = path.join(root, 'data', 'db.json');
const backupPath = path.join(root, 'data', 'db.test.backup.json');
let server;

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test.before(async () => {
  fs.copyFileSync(dbPath, backupPath);
  server = spawn('node', ['server.js'], { cwd: root, stdio: 'ignore' });
  await wait(500);
});

test.after(async () => {
  if (server) server.kill('SIGTERM');
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, dbPath);
    fs.unlinkSync(backupPath);
  }
});

test('health endpoint', async () => {
  const res = await fetch('http://127.0.0.1:8080/api/health');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
});

test('member dashboard endpoint', async () => {
  const res = await fetch('http://127.0.0.1:8080/api/member/dashboard');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.member);
  assert.ok(Array.isArray(body.courses));
});

test('task submission validates URL', async () => {
  const bad = await fetch('http://127.0.0.1:8080/api/member/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'x', url: 'not-a-url' })
  });
  assert.equal(bad.status, 422);

  const good = await fetch('http://127.0.0.1:8080/api/member/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '任務', url: 'https://example.com/img.png' })
  });
  assert.equal(good.status, 201);
});
