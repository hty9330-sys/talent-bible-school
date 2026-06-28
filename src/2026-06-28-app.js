const reasons = ["출석", "성경암송", "예배태도", "친구도움", "과제완료", "찬양참여", "특별칭찬", "기타"];
const quickAmounts = [1, 2, 5, 10];

const state = {
  view: "home",
  message: "",
  selectedStudentId: "sample-1",
  amount: 1,
  reason: "출석",
  students: [
    { id: "sample-1", name: "김하은", grade: "초2", group_name: "믿음반", total_talents: 18, is_active: true },
    { id: "sample-2", name: "박준서", grade: "초4", group_name: "소망반", total_talents: 27, is_active: true },
    { id: "sample-3", name: "이서윤", grade: "초1", group_name: "사랑반", total_talents: 12, is_active: true }
  ],
  transactions: [
    { id: "tx-1", student_id: "sample-2", student_name: "박준서", teacher_name: "정선생", amount: 5, reason: "성경암송", memo: "요절을 또렷하게 암송함", created_at: new Date().toISOString() },
    { id: "tx-2", student_id: "sample-1", student_name: "김하은", teacher_name: "정선생", amount: 2, reason: "찬양참여", memo: "율동 참여가 적극적이었음", created_at: new Date().toISOString() }
  ],
  notes: [
    { id: "note-1", student_id: "sample-3", student_name: "이서윤", teacher_name: "정선생", note: "예배 집중도가 좋아지고 있음", created_at: new Date().toISOString() },
    { id: "note-2", student_id: "sample-1", student_name: "김하은", teacher_name: "정선생", note: "친구를 먼저 도와주는 모습이 보였음", created_at: new Date().toISOString() }
  ]
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function getStudent(id) {
  return state.students.find((student) => student.id === id) || state.students[0];
}

function todayTotal() {
  const today = new Date().toDateString();
  return state.transactions
    .filter((item) => new Date(item.created_at).toDateString() === today)
    .reduce((sum, item) => sum + Number(item.amount), 0);
}

function setView(view) {
  state.view = view;
  state.message = "";
  render();
}

function selectStudent(studentId, nextView = "student") {
  state.selectedStudentId = studentId;
  setView(nextView);
}

function layout(content) {
  return `
    <div class="app-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">달란트 성경학교</p>
          <h1>아이들의 성장을 함께 기록해요</h1>
        </div>
        <button class="ghost-button" type="button" data-action="settings">설정</button>
      </header>
      <div class="notice">샘플 데이터 모드입니다. Supabase 연결 전에도 화면과 기능을 바로 확인할 수 있습니다.</div>
      ${state.message ? `<div class="toast">${escapeHtml(state.message)}</div>` : ""}
      <main>${content}</main>
      <nav class="bottom-nav" aria-label="주요 메뉴">
        ${navButton("home", "홈")}
        ${navButton("students", "아이")}
        ${navButton("award", "지급")}
        ${navButton("admin", "관리")}
      </nav>
    </div>
  `;
}

function navButton(view, label) {
  const active = state.view === view ? "active" : "";
  return `<button type="button" class="${active}" data-view="${view}">${label}</button>`;
}

function homeView() {
  return `
    <section class="stack">
      <div class="hero-panel">
        <span>오늘 지급한 달란트</span>
        <strong>${todayTotal()}</strong>
        <p>칭찬과 관찰을 함께 남겨주세요.</p>
      </div>
      <div class="quick-grid">
        <button type="button" data-view="students">아이 목록</button>
        <button type="button" data-view="award">달란트 지급</button>
        <button type="button" data-view="note">메모 작성</button>
        <button type="button" data-view="admin">관리자</button>
      </div>
      ${transactionFeed("최근 달란트 지급", state.transactions.slice(0, 4))}
      ${noteFeed("최근 작성된 메모", state.notes.slice(0, 4))}
    </section>
  `;
}

function studentsView() {
  return `
    <section class="stack">
      <div class="section-heading">
        <h2>아이 목록</h2>
        <span>${state.students.length}명</span>
      </div>
      <div class="student-list">
        ${state.students.map((student) => `
          <button class="student-row" type="button" data-student="${student.id}">
            <span>
              <strong>${escapeHtml(student.name)}</strong>
              <small>${escapeHtml(student.grade)} · ${escapeHtml(student.group_name)}</small>
            </span>
            <b>${student.total_talents} 달란트</b>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function studentView() {
  const student = getStudent(state.selectedStudentId);
  const transactions = state.transactions.filter((item) => item.student_id === student.id);
  const notes = state.notes.filter((item) => item.student_id === student.id);

  return `
    <section class="stack">
      <div class="profile-panel">
        <p>${escapeHtml(student.grade)} · ${escapeHtml(student.group_name)}</p>
        <h2>${escapeHtml(student.name)}</h2>
        <strong>${student.total_talents} 달란트</strong>
      </div>
      <div class="action-row">
        <button class="primary-button" type="button" data-view="award">달란트 지급</button>
        <button class="secondary-button" type="button" data-view="note">메모 작성</button>
      </div>
      ${transactionFeed("전체 달란트 지급 기록", transactions)}
      ${noteFeed("선생님 메모 기록", notes)}
    </section>
  `;
}

function awardView() {
  const student = getStudent(state.selectedStudentId);
  return `
    <form class="form-panel" id="award-form">
      <h2>달란트 지급</h2>
      <label>아이 선택
        <select name="studentId">
          ${state.students.map((item) => `<option value="${item.id}" ${item.id === student.id ? "selected" : ""}>${escapeHtml(item.name)} · ${escapeHtml(item.group_name)}</option>`).join("")}
        </select>
      </label>
      <div class="amount-grid">
        ${quickAmounts.map((amount) => `<button class="${state.amount === amount ? "selected" : ""}" type="button" data-amount="${amount}">${amount} 달란트</button>`).join("")}
      </div>
      <label>지급 사유
        <select name="reason">
          ${reasons.map((reason) => `<option ${reason === state.reason ? "selected" : ""}>${reason}</option>`).join("")}
        </select>
      </label>
      <label>메모
        <textarea name="memo" placeholder="칭찬 내용이나 상황을 적어주세요."></textarea>
      </label>
      <button class="primary-button" type="submit">지급 저장</button>
    </form>
  `;
}

function noteView() {
  const student = getStudent(state.selectedStudentId);
  return `
    <form class="form-panel" id="note-form">
      <h2>메모 작성</h2>
      <label>아이 선택
        <select name="studentId">
          ${state.students.map((item) => `<option value="${item.id}" ${item.id === student.id ? "selected" : ""}>${escapeHtml(item.name)} · ${escapeHtml(item.group_name)}</option>`).join("")}
        </select>
      </label>
      <label>관찰 메모
        <textarea name="note" required placeholder="예배 태도, 친구 관계, 암송, 보호자 전달 사항 등을 기록해주세요."></textarea>
      </label>
      <button class="primary-button" type="submit">메모 저장</button>
    </form>
  `;
}

function adminView() {
  return `
    <section class="stack">
      <div class="section-heading">
        <h2>관리자 화면</h2>
        <span>샘플 관리자</span>
      </div>
      <form class="form-panel compact" id="student-form">
        <h3>아이 등록</h3>
        <label>이름<input name="name" required /></label>
        <label>학년<input name="grade" required /></label>
        <label>반 또는 그룹<input name="groupName" required /></label>
        <button class="primary-button" type="submit">등록</button>
      </form>
      <div class="metric-grid">
        <div class="metric"><span>전체 아이</span><strong>${state.students.length}명</strong></div>
        <div class="metric"><span>전체 지급 기록</span><strong>${state.transactions.length}건</strong></div>
        <div class="metric"><span>전체 메모</span><strong>${state.notes.length}건</strong></div>
      </div>
      ${transactionFeed("전체 달란트 지급 내역", state.transactions)}
    </section>
  `;
}

function settingsView() {
  return `
    <section class="stack">
      <div class="form-panel">
        <h2>Supabase 연결 안내</h2>
        <p class="empty">현재 버전은 빈 화면 방지를 위해 외부 CDN 없이 샘플 모드로 실행됩니다.</p>
        <p class="empty">실제 로그인과 DB 저장은 <strong>supabase/schema.sql</strong> 적용 후 다음 단계에서 연결하면 됩니다.</p>
      </div>
    </section>
  `;
}

function transactionFeed(title, items) {
  return `
    <section class="feed">
      <h2>${title}</h2>
      ${items.length === 0 ? `<p class="empty">기록이 없습니다.</p>` : ""}
      ${items.map((item) => `
        <button class="feed-item" type="button" data-student="${item.student_id}">
          <span><b>${escapeHtml(item.student_name)}</b> · ${escapeHtml(item.reason)}</span>
          <strong>+${item.amount}</strong>
          <small>${formatDate(item.created_at)} · ${escapeHtml(item.teacher_name)}</small>
          ${item.memo ? `<p>${escapeHtml(item.memo)}</p>` : ""}
        </button>
      `).join("")}
    </section>
  `;
}

function noteFeed(title, items) {
  return `
    <section class="feed">
      <h2>${title}</h2>
      ${items.length === 0 ? `<p class="empty">메모가 없습니다.</p>` : ""}
      ${items.map((item) => `
        <button class="feed-item note" type="button" data-student="${item.student_id}">
          <span><b>${escapeHtml(item.student_name)}</b></span>
          <small>${formatDate(item.created_at)} · ${escapeHtml(item.teacher_name)}</small>
          <p>${escapeHtml(item.note)}</p>
        </button>
      `).join("")}
    </section>
  `;
}

function render() {
  const root = document.getElementById("root");
  const views = {
    home: homeView,
    students: studentsView,
    student: studentView,
    award: awardView,
    note: noteView,
    admin: adminView,
    settings: settingsView
  };

  root.innerHTML = layout((views[state.view] || homeView)());
  bindEvents(root);
}

function bindEvents(root) {
  root.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  root.querySelectorAll("[data-student]").forEach((button) => {
    button.addEventListener("click", () => selectStudent(button.dataset.student));
  });

  root.querySelectorAll("[data-amount]").forEach((button) => {
    button.addEventListener("click", () => {
      state.amount = Number(button.dataset.amount);
      render();
    });
  });

  const settings = root.querySelector("[data-action='settings']");
  if (settings) settings.addEventListener("click", () => setView("settings"));

  const awardForm = root.querySelector("#award-form");
  if (awardForm) {
    awardForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(awardForm);
      const student = getStudent(form.get("studentId"));
      const amount = Number(state.amount);
      const transaction = {
        id: crypto.randomUUID(),
        student_id: student.id,
        student_name: student.name,
        teacher_name: "정선생",
        amount,
        reason: form.get("reason"),
        memo: form.get("memo"),
        created_at: new Date().toISOString()
      };

      student.total_talents += amount;
      state.transactions.unshift(transaction);
      state.selectedStudentId = student.id;
      state.message = `${student.name}에게 ${amount} 달란트를 지급했습니다.`;
      state.view = "student";
      render();
    });

    awardForm.reason.addEventListener("change", () => {
      state.reason = awardForm.reason.value;
    });
  }

  const noteForm = root.querySelector("#note-form");
  if (noteForm) {
    noteForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(noteForm);
      const student = getStudent(form.get("studentId"));
      const note = String(form.get("note") || "").trim();
      if (!note) return;

      state.notes.unshift({
        id: crypto.randomUUID(),
        student_id: student.id,
        student_name: student.name,
        teacher_name: "정선생",
        note,
        created_at: new Date().toISOString()
      });
      state.selectedStudentId = student.id;
      state.message = "메모를 저장했습니다.";
      state.view = "student";
      render();
    });
  }

  const studentForm = root.querySelector("#student-form");
  if (studentForm) {
    studentForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(studentForm);
      const student = {
        id: crypto.randomUUID(),
        name: form.get("name"),
        grade: form.get("grade"),
        group_name: form.get("groupName"),
        total_talents: 0,
        is_active: true
      };

      state.students.unshift(student);
      state.selectedStudentId = student.id;
      state.message = "아이를 등록했습니다.";
      state.view = "student";
      render();
    });
  }
}

document.addEventListener("DOMContentLoaded", render);
