const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 8080;
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const { normalizeText, isValidUrl, toInt, newId } = require('./lib/validators');
const ADMIN_ACCOUNT = process.env.ADMIN_ACCOUNT || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';

function readDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDb(db) {
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_PATH);
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function getMemberDashboard(db) {
  const member = db.member;
  return {
    member,
    rules: db.rules,
    activities: db.activities.filter((a) => member.tags.includes(a.tag)),
    courses: db.courses.filter((c) => member.tags.includes(c.tag)),
    calendar: db.calendar,
    checkins: db.checkins.filter((c) => member.purchases.includes(c.product)),
    tasks: db.tasks,
    announcements: db.announcements
  };
}

function serveStatic(reqPath, res) {
  const safePath = reqPath === '/' ? '/web/index.html' : reqPath;
  const normalized = path.normalize(safePath).replace(/^\.\.(\/|\\|$)+/, '');
  const filePath = path.join(__dirname, normalized);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8'
    };
    res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain; charset=utf-8' });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  if (pathname.startsWith('/api/')) {
    try {
      const db = readDb();

      if (req.method === 'GET' && pathname === '/api/health') {
        return sendJson(res, 200, { ok: true, now: new Date().toISOString() });
      }

      if (req.method === 'GET' && pathname === '/api/member/dashboard') {
        return sendJson(res, 200, getMemberDashboard(db));
      }


      if (req.method === 'POST' && pathname === '/api/member/login') {
        const body = await parseBody(req);
        const name = normalizeText(body.name, 50);
        const phone = normalizeText(body.phone, 20);
        const ok = name === db.member.name && phone === db.member.phone;
        if (!ok) return sendJson(res, 401, { error: '姓名或手機不正確' });
        return sendJson(res, 200, { ok: true, member: { name: db.member.name, phone: db.member.phone } });
      }

      if (req.method === 'POST' && pathname === '/api/admin/login') {
        const body = await parseBody(req);
        const account = normalizeText(body.account, 50);
        const password = normalizeText(body.password, 50);
        if (account !== ADMIN_ACCOUNT || password !== ADMIN_PASSWORD) {
          return sendJson(res, 401, { error: '帳號或密碼錯誤' });
        }
        return sendJson(res, 200, { ok: true });
      }

      if (req.method === 'POST' && pathname === '/api/member/enroll') {
        const body = await parseBody(req);
        const courseId = toInt(body.courseId);
        const course = db.courses.find((c) => c.id === courseId);
        if (!course) return sendJson(res, 404, { error: 'Course not found' });
        course.enrolled = true;
        writeDb(db);
        return sendJson(res, 200, { ok: true, course });
      }

      if (req.method === 'POST' && pathname === '/api/member/tasks') {
        const body = await parseBody(req);
        const title = normalizeText(body.title, 80);
        const url = normalizeText(body.url, 500);
        if (!title || !url) return sendJson(res, 400, { error: 'title and url required' });
        if (!isValidUrl(url)) return sendJson(res, 422, { error: 'url must be http/https' });
        const task = { id: newId(), title, url, status: 'pending' };
        db.tasks.unshift(task);
        writeDb(db);
        return sendJson(res, 201, task);
      }

      if (req.method === 'GET' && pathname === '/api/admin/overview') {
        return sendJson(res, 200, {
          members: db.members,
          courses: db.courses,
          tasks: db.tasks,
          announcements: db.announcements
        });
      }

      if (req.method === 'POST' && pathname === '/api/admin/tags') {
        const body = await parseBody(req);
        const memberId = toInt(body.memberId);
        const tag = normalizeText(body.tag, 30);
        const member = db.members.find((m) => m.id === memberId);
        if (!member || !tag) return sendJson(res, 400, { error: 'invalid memberId or tag' });
        if (!member.tags.includes(tag)) member.tags.push(tag);
        if (memberId === db.member.id && !db.member.tags.includes(tag)) db.member.tags.push(tag);
        writeDb(db);
        return sendJson(res, 200, { ok: true, member });
      }

      if (req.method === 'POST' && pathname === '/api/admin/courses') {
        const body = await parseBody(req);
        const title = normalizeText(body.title, 80);
        const time = normalizeText(body.time, 40);
        const tag = normalizeText(body.tag, 30);
        if (!title || !time || !tag) return sendJson(res, 400, { error: 'title, time, tag required' });
        const course = { id: newId(), title, time, tag, enrolled: false };
        db.courses.unshift(course);
        writeDb(db);
        return sendJson(res, 201, course);
      }

      if (req.method === 'PATCH' && pathname === '/api/admin/tasks') {
        const body = await parseBody(req);
        const taskId = toInt(body.id);
        const task = db.tasks.find((t) => t.id === taskId);
        if (!task) return sendJson(res, 404, { error: 'Task not found' });
        const status = normalizeText(body.status, 20);
        if (!['approved', 'rejected'].includes(status)) return sendJson(res, 400, { error: 'Invalid status' });
        task.status = status;
        writeDb(db);
        return sendJson(res, 200, { ok: true, task });
      }

      if (req.method === 'POST' && pathname === '/api/admin/announcements') {
        const body = await parseBody(req);
        const text = normalizeText(body.text, 200);
        if (!text) return sendJson(res, 400, { error: 'text required' });
        db.announcements.unshift(text);
        writeDb(db);
        return sendJson(res, 201, { ok: true, text });
      }

      return sendJson(res, 404, { error: 'API route not found' });
    } catch (error) {
      return sendJson(res, 500, { error: error.message });
    }
  }

  return serveStatic(pathname, res);
});

server.listen(PORT, () => {
  console.log(`VIP app running at http://localhost:${PORT}/web/index.html`);
});
