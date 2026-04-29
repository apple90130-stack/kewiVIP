const { normalizeText, isValidUrl, toInt, newId } = require('../lib/validators');

const seed = {
  member: {
    id: 1,
    name: '王小美',
    totalAmount: 24600,
    shareCount: 7,
    groupCount: 5,
    tags: ['益生菌', '鱸魚精'],
    purchases: ['益生菌', '鱸魚精']
  },
  rules: { amountTarget: 30000, shareTarget: 10 },
  activities: [
    { name: '益生菌 14 天打卡挑戰', tag: '益生菌' },
    { name: '鱸魚精回購抽獎', tag: '鱸魚精' },
    { name: '瘦身社群限定直播', tag: '瘦身' }
  ],
  courses: [
    { id: 1, title: '5/1 益生菌課程', time: '2026-05-01 20:00', tag: '益生菌', enrolled: false },
    { id: 2, title: '5/3 鱸魚精營養講座', time: '2026-05-03 20:00', tag: '鱸魚精', enrolled: false }
  ],
  calendar: ['2026-05-02｜益生菌體驗團', '2026-05-06｜中年活力團：鱸魚精', '2026-05-10｜母親節保養專團'],
  checkins: [
    { name: '益生菌連續打卡 7 天', product: '益生菌' },
    { name: '鱸魚精飲用回饋打卡', product: '鱸魚精' }
  ],
  tasks: [],
  announcements: ['4/30 前完成任務送 50 點', '5/1 晚上 8 點益生菌課程開放報名'],
  members: [
    { id: 1, name: '王小美', tags: ['益生菌', '鱸魚精'] },
    { id: 2, name: '林先生', tags: ['瘦身'] }
  ]
};

const db = globalThis.__vip_db || structuredClone(seed);
globalThis.__vip_db = db;

function json(res, code, data) {
  res.status(code).json(data);
}

function dashboard() {
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

module.exports = async function handler(req, res) {
  const path = req.url.replace(/^\/api/, '').split('?')[0];

  if (req.method === 'GET' && path === '/health') return json(res, 200, { ok: true, now: new Date().toISOString() });
  if (req.method === 'GET' && path === '/member/dashboard') return json(res, 200, dashboard());

  if (req.method === 'POST' && path === '/member/enroll') {
    const { courseId } = req.body || {};
    const parsedId = toInt(courseId);
    const course = db.courses.find((c) => c.id === parsedId);
    if (!course) return json(res, 404, { error: 'Course not found' });
    course.enrolled = true;
    return json(res, 200, { ok: true, course });
  }

  if (req.method === 'POST' && path === '/member/tasks') {
    const title = normalizeText((req.body || {}).title, 80);
    const url = normalizeText((req.body || {}).url, 500);
    if (!title || !url) return json(res, 400, { error: 'title and url required' });
    if (!isValidUrl(url)) return json(res, 422, { error: 'url must be http/https' });
    const task = { id: newId(), title, url, status: 'pending' };
    db.tasks.unshift(task);
    return json(res, 201, task);
  }

  if (req.method === 'GET' && path === '/admin/overview') {
    return json(res, 200, { members: db.members, courses: db.courses, tasks: db.tasks, announcements: db.announcements });
  }

  if (req.method === 'POST' && path === '/admin/tags') {
    const memberId = toInt((req.body || {}).memberId);
    const member = db.members.find((m) => m.id === memberId);
    const safeTag = normalizeText((req.body || {}).tag, 30);
    if (!member || !safeTag) return json(res, 400, { error: 'invalid memberId or tag' });
    if (!member.tags.includes(safeTag)) member.tags.push(safeTag);
    if (member.id === db.member.id && !db.member.tags.includes(safeTag)) db.member.tags.push(safeTag);
    return json(res, 200, { ok: true, member });
  }

  if (req.method === 'POST' && path === '/admin/courses') {
    const title = normalizeText((req.body || {}).title, 80);
    const time = normalizeText((req.body || {}).time, 40);
    const tag = normalizeText((req.body || {}).tag, 30);
    if (!title || !time || !tag) return json(res, 400, { error: 'title, time, tag required' });
    const course = { id: newId(), title, time, tag, enrolled: false };
    db.courses.unshift(course);
    return json(res, 201, course);
  }

  if (req.method === 'PATCH' && path === '/admin/tasks') {
    const taskId = toInt((req.body || {}).id);
    const status = normalizeText((req.body || {}).status, 20);
    const task = db.tasks.find((t) => t.id === taskId);
    if (!task) return json(res, 404, { error: 'Task not found' });
    if (!['approved', 'rejected'].includes(status)) return json(res, 400, { error: 'Invalid status' });
    task.status = status;
    return json(res, 200, { ok: true, task });
  }

  if (req.method === 'POST' && path === '/admin/announcements') {
    const value = normalizeText((req.body || {}).text, 200);
    if (!value) return json(res, 400, { error: 'text required' });
    db.announcements.unshift(value);
    return json(res, 201, { ok: true, text: value });
  }

  return json(res, 404, { error: 'API route not found' });
}
