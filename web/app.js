let memberData = null;
let adminData = null;

const ADMIN_ACCOUNT = 'admin';
const ADMIN_PASSWORD = '123456';

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

function setupMemberAuth() {
  const loginCard = document.getElementById('member-login-card');
  const app = document.getElementById('member-app');
  const form = document.getElementById('member-login-form');
  const error = document.getElementById('member-login-error');
  const logoutBtn = document.getElementById('member-logout');
  if (!loginCard || !app || !form || !error || !logoutBtn) return;

  const openMemberApp = async () => {
    loginCard.style.display = 'none';
    app.style.display = 'grid';
    logoutBtn.style.display = 'inline-block';
    await refreshAll();
  };

  if (sessionStorage.getItem('memberAuth') === 'ok') openMemberApp();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('member-name').value.trim();
    const phone = document.getElementById('member-phone').value.trim();
    const phoneOk = /^09\d{8}$/.test(phone);

    if (!name || !phoneOk) {
      error.textContent = '請輸入正確姓名與手機號碼（09 開頭，共 10 碼）。';
      return;
    }

    error.textContent = '';
    sessionStorage.setItem('memberAuth', 'ok');
    await openMemberApp();
  };

  logoutBtn.onclick = () => {
    sessionStorage.removeItem('memberAuth');
    app.style.display = 'none';
    loginCard.style.display = 'block';
    logoutBtn.style.display = 'none';
  };
}

function setupAdminAuth() {
  const loginCard = document.getElementById('admin-login-card');
  const app = document.getElementById('admin-app');
  const form = document.getElementById('admin-login-form');
  const error = document.getElementById('admin-login-error');
  const logoutBtn = document.getElementById('admin-logout');
  if (!loginCard || !app || !form || !error || !logoutBtn) return;

  const openAdminApp = async () => {
    loginCard.style.display = 'none';
    app.style.display = 'grid';
    logoutBtn.style.display = 'inline-block';
    await refreshAll();
  };

  if (sessionStorage.getItem('adminAuth') === 'ok') openAdminApp();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const account = document.getElementById('admin-account').value.trim();
    const password = document.getElementById('admin-password').value;
    if (account !== ADMIN_ACCOUNT || password !== ADMIN_PASSWORD) {
      error.textContent = '帳號或密碼錯誤。';
      return;
    }

    error.textContent = '';
    sessionStorage.setItem('adminAuth', 'ok');
    await openAdminApp();
  };

  logoutBtn.onclick = () => {
    sessionStorage.removeItem('adminAuth');
    app.style.display = 'none';
    loginCard.style.display = 'block';
    logoutBtn.style.display = 'none';
  };
}

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
  if (document.getElementById('member-app') && sessionStorage.getItem('memberAuth') === 'ok') jobs.push(loadMember());
  if (document.getElementById('admin-app') && sessionStorage.getItem('adminAuth') === 'ok') jobs.push(loadAdmin());
  await Promise.all(jobs);
  renderMember();
  renderAdmin();
}

(async function init() {
  try {
    bindForms();
    setupMemberAuth();
    setupAdminAuth();
  } catch (error) {
    alert(`載入失敗：${error.message}`);
  }
})();
