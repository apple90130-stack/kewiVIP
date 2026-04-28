const state = {
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
  calendar: [
    '2026-05-02｜益生菌體驗團',
    '2026-05-06｜中年活力團：鱸魚精',
    '2026-05-10｜母親節保養專團'
  ],
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

function formatMoney(value) {
  return `NT$ ${value.toLocaleString('zh-TW')}`;
}

function renderMember() {
  if (!document.getElementById('member-app')) return;
  const { member, rules } = state;
  const amountRate = Math.min(member.totalAmount / rules.amountTarget, 1);
  const shareRate = Math.min(member.shareCount / rules.shareTarget, 1);
  const rate = Math.round(((amountRate + shareRate) / 2) * 100);

  document.getElementById('vip-summary').textContent =
    `消費 ${formatMoney(member.totalAmount)} / ${formatMoney(rules.amountTarget)}，曬單 ${member.shareCount}/${rules.shareTarget}（達成 ${rate}%）`;
  document.getElementById('vip-progress').style.width = `${rate}%`;
  document.getElementById('group-count').textContent = member.groupCount;
  document.getElementById('total-amount').textContent = formatMoney(member.totalAmount);
  document.getElementById('晒单-count').textContent = member.shareCount;

  const activities = state.activities.filter((a) => member.tags.includes(a.tag));
  renderList('member-activities', activities.map((a) => `${a.name} <span class="badge">${a.tag}</span>`));

  const targetCourses = state.courses.filter((c) => member.tags.includes(c.tag));
  renderList('courses', targetCourses.map((c) =>
    `${c.title}｜${c.time} <button onclick="enroll(${c.id})">${c.enrolled ? '已報名' : '我要報名'}</button>`
  ));

  renderList('calendar', state.calendar);

  const validCheckins = state.checkins.filter((c) => member.purchases.includes(c.product));
  renderList('checkins', validCheckins.map((c) => `${c.name} <span class="badge">${c.product}</span>`));

  renderList('task-submissions', state.tasks.map((t) =>
    `${t.title}｜<a href="${t.url}" target="_blank">查看</a> <span class="badge">${t.status}</span>`
  ));

  renderList('announcements', state.announcements);

  const form = document.getElementById('task-form');
  form.onsubmit = (e) => {
    e.preventDefault();
    const title = document.getElementById('task-title').value;
    const url = document.getElementById('task-url').value;
    state.tasks.unshift({ id: Date.now(), title, url, status: 'pending' });
    form.reset();
    renderMember();
    renderAdmin();
  };
}

function enroll(id) {
  const c = state.courses.find((item) => item.id === id);
  if (!c) return;
  c.enrolled = true;
  renderMember();
}
window.enroll = enroll;

function renderAdmin() {
  if (!document.getElementById('admin-app')) return;

  const memberSelect = document.getElementById('member-select');
  memberSelect.innerHTML = state.members.map((m) => `<option value="${m.id}">${m.name}</option>`).join('');

  renderList('member-tags', state.members.map((m) =>
    `${m.name}：${m.tags.map((tag) => `<span class="badge">${tag}</span>`).join('')}`
  ));

  renderList('admin-courses', state.courses.map((c) =>
    `${c.title}｜${c.time}｜投放：<span class="badge">${c.tag}</span> <span class="small">${c.enrolled ? '已有報名' : '尚未報名'}</span>`
  ));

  renderList('task-review', state.tasks.map((t) =>
    `${t.title} <span class="badge">${t.status}</span>
      ${t.status === 'pending' ? `<button onclick="reviewTask(${t.id}, 'approved')">通過</button>
      <button onclick="reviewTask(${t.id}, 'rejected')">退回</button>` : ''}`
  ));

  renderList('admin-notices', state.announcements);

  document.getElementById('tag-form').onsubmit = (e) => {
    e.preventDefault();
    const memberId = Number(document.getElementById('member-select').value);
    const tag = document.getElementById('tag-input').value.trim();
    if (!tag) return;
    const m = state.members.find((item) => item.id === memberId);
    if (m && !m.tags.includes(tag)) m.tags.push(tag);
    if (memberId === state.member.id && !state.member.tags.includes(tag)) state.member.tags.push(tag);
    document.getElementById('tag-input').value = '';
    renderAdmin();
    renderMember();
  };

  document.getElementById('course-form').onsubmit = (e) => {
    e.preventDefault();
    const title = document.getElementById('course-title').value;
    const time = document.getElementById('course-time').value;
    const tag = document.getElementById('course-tag').value;
    state.courses.unshift({ id: Date.now(), title, time, tag, enrolled: false });
    e.target.reset();
    renderAdmin();
    renderMember();
  };

  document.getElementById('notice-form').onsubmit = (e) => {
    e.preventDefault();
    const text = document.getElementById('notice-text').value;
    state.announcements.unshift(text);
    e.target.reset();
    renderAdmin();
    renderMember();
  };
}

function reviewTask(id, status) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  task.status = status;
  renderAdmin();
  renderMember();
}
window.reviewTask = reviewTask;

function renderList(id, items) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = items.length ? items.map((item) => `<li>${item}</li>`).join('') : '<li class="small">目前無資料</li>';
}

renderMember();
renderAdmin();
