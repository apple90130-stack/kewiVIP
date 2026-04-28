let memberData = null;
let adminData = null;

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${response.status}`);
  }
  return response.json();
}

function formatMoney(value) {
  return `NT$ ${Number(value).toLocaleString('zh-TW')}`;
}

function renderList(id, items) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = items.length ? items.map((item) => `<li>${item}</li>`).join('') : '<li class="small">目前無資料</li>';
}

async function loadMember() {
  memberData = await api('/api/member/dashboard');
}

async function loadAdmin() {
  adminData = await api('/api/admin/overview');
}

function renderMember() {
  if (!document.getElementById('member-app') || !memberData) return;

  const { member, rules, activities, courses, calendar, checkins, tasks, announcements } = memberData;
  const amountRate = Math.min(member.totalAmount / rules.amountTarget, 1);
  const shareRate = Math.min(member.shareCount / rules.shareTarget, 1);
  const rate = Math.round(((amountRate + shareRate) / 2) * 100);

  document.getElementById('vip-summary').textContent =
    `消費 ${formatMoney(member.totalAmount)} / ${formatMoney(rules.amountTarget)}，曬單 ${member.shareCount}/${rules.shareTarget}（達成 ${rate}%）`;
  document.getElementById('vip-progress').style.width = `${rate}%`;
  document.getElementById('group-count').textContent = member.groupCount;
  document.getElementById('total-amount').textContent = formatMoney(member.totalAmount);
  document.getElementById('share-count').textContent = member.shareCount;

  renderList('member-activities', activities.map((a) => `${a.name} <span class="badge">${a.tag}</span>`));
  renderList('courses', courses.map((c) =>
    `${c.title}｜${c.time} <button onclick="enroll(${c.id})">${c.enrolled ? '已報名' : '我要報名'}</button>`
  ));
  renderList('calendar', calendar);
  renderList('checkins', checkins.map((c) => `${c.name} <span class="badge">${c.product}</span>`));
  renderList('task-submissions', tasks.map((t) =>
    `${t.title}｜<a href="${t.url}" target="_blank" rel="noreferrer">查看</a> <span class="badge">${t.status}</span>`
  ));
  renderList('announcements', announcements);
}

async function enroll(id) {
  await api('/api/member/enroll', {
    method: 'POST',
    body: JSON.stringify({ courseId: id })
  });
  await refreshAll();
}
window.enroll = enroll;

function renderAdmin() {
  if (!document.getElementById('admin-app') || !adminData) return;

  const memberSelect = document.getElementById('member-select');
  memberSelect.innerHTML = adminData.members.map((m) => `<option value="${m.id}">${m.name}</option>`).join('');

  renderList('member-tags', adminData.members.map((m) =>
    `${m.name}：${m.tags.map((tag) => `<span class="badge">${tag}</span>`).join('')}`
  ));

  renderList('admin-courses', adminData.courses.map((c) =>
    `${c.title}｜${c.time}｜投放：<span class="badge">${c.tag}</span> <span class="small">${c.enrolled ? '已有報名' : '尚未報名'}</span>`
  ));

  renderList('task-review', adminData.tasks.map((t) =>
    `${t.title} <span class="badge">${t.status}</span>
      ${t.status === 'pending' ? `<button onclick="reviewTask(${t.id}, 'approved')">通過</button>
      <button onclick="reviewTask(${t.id}, 'rejected')">退回</button>` : ''}`
  ));

  renderList('admin-notices', adminData.announcements);
}

async function reviewTask(id, status) {
  await api('/api/admin/tasks', {
    method: 'PATCH',
    body: JSON.stringify({ id, status })
  });
  await refreshAll();
}
window.reviewTask = reviewTask;

function bindForms() {
  const taskForm = document.getElementById('task-form');
  if (taskForm) {
    taskForm.onsubmit = async (e) => {
      e.preventDefault();
      const title = document.getElementById('task-title').value;
      const url = document.getElementById('task-url').value;
      await api('/api/member/tasks', {
        method: 'POST',
        body: JSON.stringify({ title, url })
      });
      taskForm.reset();
      await refreshAll();
    };
  }

  const tagForm = document.getElementById('tag-form');
  if (tagForm) {
    tagForm.onsubmit = async (e) => {
      e.preventDefault();
      const memberId = Number(document.getElementById('member-select').value);
      const tag = document.getElementById('tag-input').value.trim();
      if (!tag) return;
      await api('/api/admin/tags', {
        method: 'POST',
        body: JSON.stringify({ memberId, tag })
      });
      document.getElementById('tag-input').value = '';
      await refreshAll();
    };
  }

  const courseForm = document.getElementById('course-form');
  if (courseForm) {
    courseForm.onsubmit = async (e) => {
      e.preventDefault();
      const title = document.getElementById('course-title').value;
      const time = document.getElementById('course-time').value;
      const tag = document.getElementById('course-tag').value;
      await api('/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify({ title, time, tag })
      });
      courseForm.reset();
      await refreshAll();
    };
  }

  const noticeForm = document.getElementById('notice-form');
  if (noticeForm) {
    noticeForm.onsubmit = async (e) => {
      e.preventDefault();
      const text = document.getElementById('notice-text').value;
      await api('/api/admin/announcements', {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      noticeForm.reset();
      await refreshAll();
    };
  }
}

async function refreshAll() {
  const jobs = [];
  if (document.getElementById('member-app')) jobs.push(loadMember());
  if (document.getElementById('admin-app')) jobs.push(loadAdmin());
  await Promise.all(jobs);
  renderMember();
  renderAdmin();
}

(async function init() {
  try {
    bindForms();
    await refreshAll();
  } catch (error) {
    alert(`載入失敗：${error.message}`);
  }
})();
