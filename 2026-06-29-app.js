const CONFIG_KEY = "talent-bible-school:supabase-config";
const DEFAULT_SUPABASE_URL = "https://eesdzgehomzccrrykrqb.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlc2R6Z2Vob216Y2NycnlrcnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2ODc1ODYsImV4cCI6MjA5ODI2MzU4Nn0.DQvThttw0BniIa6zvzM7B2VuqCrPdmpmON4nX3JbOys";
const reasons = ["출석", "성경암송", "성경학습", "예배태도", "친구도움", "과제완료", "찬양참여", "특별칭찬", "기타"];
const quickAmounts = [1, 2, 5, 10];

const bibleLesson = {
  verseRef: "Colossians 1:19-20 (CSB)",
  title: "Bible English Adventure",
  memoryVerse: "By making peace through his blood, shed on the cross.",
  words: [
    { word: "God", sound: "[가-드] /ɡɑːd/", meaning: "하나님", example: "God loves me." },
    { word: "Peace", sound: "[피-스] /piːs/", meaning: "평화, 평안", example: "Jesus gives me peace." },
    { word: "Cross", sound: "[크로-스] /krɔːs/", meaning: "십자가", example: "Jesus died on the cross." },
    { word: "Blood", sound: "[블러드] /blʌd/", meaning: "피", example: "Jesus' blood saves me." },
    { word: "Fullness", sound: "[풀-니스] /ˈfʊlnəs/", meaning: "가득함, 충만함", example: "Jesus has all the fullness." },
    { word: "Reconcile", sound: "[레컨사일] /ˈrekənsaɪl/", meaning: "다시 친구가 되다", example: "Jesus reconciles us to God." }
  ],
  lines: [
    "For God", "was pleased", "to have all his fullness", "dwell in him,", "and through him",
    "to reconcile everything,", "by making peace", "through his blood,", "shed on the cross."
  ]
};

const sampleStudents = [
  { id: "sample-1", name: "김하은", grade: "초2", group_name: "믿음반", total_talents: 18, is_active: true },
  { id: "sample-2", name: "박준서", grade: "초4", group_name: "소망반", total_talents: 27, is_active: true },
  { id: "sample-3", name: "이서윤", grade: "초1", group_name: "사랑반", total_talents: 12, is_active: true }
];

const state = {
  view: "home",
  message: "",
  loading: false,
  selectedStudentId: "sample-1",
  amount: 1,
  reason: "출석",
  config: loadConfig(),
  client: null,
  session: null,
  profile: null,
  students: sampleStudents.map((item) => ({ ...item })),
  transactions: [
    { id: "tx-1", student_id: "sample-2", student_name: "박준서", teacher_name: "정선생", amount: 5, reason: "성경암송", memo: "요절을 또렷하게 암송함", created_at: new Date().toISOString() },
    { id: "tx-2", student_id: "sample-1", student_name: "김하은", teacher_name: "정선생", amount: 2, reason: "찬양참여", memo: "율동 참여가 적극적이었음", created_at: new Date().toISOString() }
  ],
  notes: [
    { id: "note-1", student_id: "sample-3", student_name: "이서윤", teacher_name: "정선생", note: "예배 집중도가 좋아지고 있음", created_at: new Date().toISOString() },
    { id: "note-2", student_id: "sample-1", student_name: "김하은", teacher_name: "정선생", note: "친구를 먼저 도와주는 모습이 보였음", created_at: new Date().toISOString() }
  ],
  bibleRecords: []
};

function loadConfig() {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || "null"); } catch { return null; }
}

function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  state.config = config;
}

function isConfigured() {
  return Boolean((state.config?.url || DEFAULT_SUPABASE_URL) && (state.config?.anonKey || DEFAULT_SUPABASE_ANON_KEY) && window.supabase?.createClient);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function getStudent(id) {
  return state.students.find((student) => student.id === id) || state.students[0];
}

function currentTeacherName() {
  return state.profile?.name || state.session?.user?.email || "정선생";
}

function todayTotal() {
  const today = new Date().toDateString();
  return state.transactions
    .filter((item) => new Date(item.created_at).toDateString() === today)
    .reduce((sum, item) => sum + Number(item.amount), 0);
}

function setMessage(message) {
  state.message = message;
  render();
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

async function initSupabase() {
  if (!isConfigured()) return;
  state.client = window.supabase.createClient(state.config?.url || DEFAULT_SUPABASE_URL, state.config?.anonKey || DEFAULT_SUPABASE_ANON_KEY);
  const { data } = await state.client.auth.getSession();
  state.session = data.session;
  if (state.session) await loadRemoteData();
  state.client.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    if (session) {
      await loadRemoteData();
      state.view = "home";
    } else {
      state.profile = null;
      state.view = "login";
    }
    render();
  });
}

async function loadRemoteData() {
  if (!state.client || !state.session) return;
  state.loading = true;
  render();
  const userId = state.session.user.id;
  const [profileResult, studentResult, transactionResult, noteResult, bibleResult] = await Promise.all([
    state.client.from("users").select("id,name,email,role").eq("id", userId).maybeSingle(),
    state.client.from("students").select("*").eq("is_active", true).order("name"),
    state.client.from("talent_transactions").select("*, students(name), users(name)").order("created_at", { ascending: false }).limit(80),
    state.client.from("student_notes").select("*, students(name), users(name)").order("created_at", { ascending: false }).limit(80),
    state.client.from("bible_learning_records").select("*, students(name), users(name)").order("created_at", { ascending: false }).limit(80)
  ]);
  if (profileResult.data) state.profile = profileResult.data;
  if (studentResult.data) state.students = studentResult.data;
  if (transactionResult.data) state.transactions = transactionResult.data.map(mapTransaction);
  if (noteResult.data) state.notes = noteResult.data.map(mapNote);
  if (bibleResult.data) state.bibleRecords = bibleResult.data.map(mapBibleRecord);
  state.selectedStudentId = state.students[0]?.id || state.selectedStudentId;
  state.loading = false;
}

function mapTransaction(item) {
  return { ...item, student_name: item.students?.name || "아이", teacher_name: item.users?.name || "선생님" };
}
function mapNote(item) {
  return { ...item, student_name: item.students?.name || "아이", teacher_name: item.users?.name || "선생님" };
}
function mapBibleRecord(item) {
  return { ...item, student_name: item.students?.name || "아이", teacher_name: item.users?.name || "선생님" };
}

function layout(content) {
  const modeText = isConfigured()
    ? state.session ? `${escapeHtml(currentTeacherName())} 로그인 중` : "Supabase 연결됨"
    : "샘플 데이터 모드";
  return `
    <div class="app-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">달란트 성경학교</p>
          <h1>아이들의 말씀과 성장을 함께 기록해요</h1>
        </div>
        <div class="topbar-actions">
          ${state.session ? `<button class="ghost-button" type="button" data-action="logout">로그아웃</button>` : `<button class="ghost-button" type="button" data-view="login">로그인</button>`}
          <button class="ghost-button" type="button" data-view="settings">설정</button>
        </div>
      </header>
      <div class="notice">${modeText}${state.loading ? " · 불러오는 중" : ""}</div>
      ${state.message ? `<div class="toast">${escapeHtml(state.message)}</div>` : ""}
      <main>${content}</main>
      <nav class="bottom-nav" aria-label="주요 메뉴">
        ${navButton("home", "홈")}
        ${navButton("students", "아이")}
        ${navButton("award", "지급")}
        ${navButton("bible", "성경")}
        ${navButton("admin", "관리")}
      </nav>
    </div>`;
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
        <p>칭찬, 암송, 성경 영어 학습을 한곳에 기록합니다.</p>
      </div>
      <div class="quick-grid">
        <button type="button" data-view="students">아이 목록</button>
        <button type="button" data-view="award">달란트 지급</button>
        <button type="button" data-view="bible">성경 학습</button>
        <button type="button" data-view="note">메모 작성</button>
      </div>
      ${transactionFeed("최근 달란트 지급", state.transactions.slice(0, 4))}
      ${bibleFeed("최근 성경 학습", state.bibleRecords.slice(0, 4))}
      ${noteFeed("최근 작성된 메모", state.notes.slice(0, 4))}
    </section>`;
}

function loginView() {
  if (!isConfigured()) {
    return `
      <section class="login-screen inline-login">
        <form class="login-card" id="config-form">
          <p class="eyebrow">Supabase 설정 필요</p>
          <h1>먼저 프로젝트 정보를 저장하세요</h1>
          <label>Project URL<input name="url" required placeholder="https://xxxx.supabase.co" value="${escapeHtml(state.config?.url || DEFAULT_SUPABASE_URL)}" /></label>
          <label>Anon public key<input name="anonKey" required placeholder="eyJ..." value="${escapeHtml(state.config?.anonKey || DEFAULT_SUPABASE_ANON_KEY)}" /></label>
          <button class="primary-button" type="submit">설정 저장</button>
        </form>
      </section>`;
  }
  return `
    <section class="login-screen inline-login">
      <form class="login-card" id="login-form">
        <p class="eyebrow">선생님 로그인</p>
        <h1>수업 기록을 저장합니다</h1>
        <label>이메일<input name="email" type="email" required autocomplete="email" /></label>
        <label>비밀번호<input name="password" type="password" required autocomplete="current-password" /></label>
        <button class="primary-button" type="submit">로그인</button>
        <button class="secondary-button" type="button" data-view="settings">Supabase 설정 변경</button>
      </form>
    </section>`;
}

function studentsView() {
  return `
    <section class="stack">
      <div class="section-heading"><h2>아이 목록</h2><span>${state.students.length}명</span></div>
      <div class="student-list">
        ${state.students.map((student) => `
          <button class="student-row" type="button" data-student="${student.id}">
            <span><strong>${escapeHtml(student.name)}</strong><small>${escapeHtml(student.grade)} · ${escapeHtml(student.group_name)}</small></span>
            <b>${student.total_talents} 달란트</b>
          </button>`).join("")}
      </div>
    </section>`;
}

function studentView() {
  const student = getStudent(state.selectedStudentId);
  const transactions = state.transactions.filter((item) => item.student_id === student.id);
  const notes = state.notes.filter((item) => item.student_id === student.id);
  const bibleRecords = state.bibleRecords.filter((item) => item.student_id === student.id);
  return `
    <section class="stack">
      <div class="profile-panel"><p>${escapeHtml(student.grade)} · ${escapeHtml(student.group_name)}</p><h2>${escapeHtml(student.name)}</h2><strong>${student.total_talents} 달란트</strong></div>
      <div class="action-row"><button class="primary-button" type="button" data-view="award">달란트 지급</button><button class="secondary-button" type="button" data-view="bible">성경 학습</button></div>
      ${transactionFeed("전체 달란트 지급 기록", transactions)}
      ${bibleFeed("성경 학습 기록", bibleRecords)}
      ${noteFeed("선생님 메모 기록", notes)}
    </section>`;
}

function awardView() {
  const student = getStudent(state.selectedStudentId);
  return `
    <form class="form-panel" id="award-form">
      <h2>달란트 지급</h2>${studentSelect(student.id)}
      <div class="amount-grid">${quickAmounts.map((amount) => `<button class="${state.amount === amount ? "selected" : ""}" type="button" data-amount="${amount}">${amount} 달란트</button>`).join("")}</div>
      <label>지급 사유<select name="reason">${reasons.map((reason) => `<option ${reason === state.reason ? "selected" : ""}>${reason}</option>`).join("")}</select></label>
      <label>메모<textarea name="memo" placeholder="칭찬 내용이나 상황을 적어주세요."></textarea></label>
      <button class="primary-button" type="submit">지급 저장</button>
    </form>`;
}

function noteView() {
  const student = getStudent(state.selectedStudentId);
  return `
    <form class="form-panel" id="note-form">
      <h2>메모 작성</h2>${studentSelect(student.id)}
      <label>관찰 메모<textarea name="note" required placeholder="예배 태도, 친구 관계, 암송, 보호자 전달 사항 등을 기록해주세요."></textarea></label>
      <button class="primary-button" type="submit">메모 저장</button>
    </form>`;
}

function bibleView() {
  const student = getStudent(state.selectedStudentId);
  return `
    <section class="stack bible-view">
      <div class="section-heading"><h2>성경 영어 학습</h2><span>${escapeHtml(bibleLesson.verseRef)}</span></div>
      <div class="form-panel bible-lesson-panel">
        ${studentSelect(student.id)}
        <p class="eyebrow">${escapeHtml(bibleLesson.title)}</p>
        <h2>오늘의 말씀과 단어</h2>
        <p class="empty">단어를 듣고, 말씀을 한 줄씩 따라 읽은 뒤 완료하면 달란트가 기록됩니다.</p>
        <div class="word-grid">${bibleLesson.words.map((item) => `
          <div class="word-card"><div><strong>${escapeHtml(item.word)}</strong><small>${escapeHtml(item.sound)}</small></div><p>${escapeHtml(item.meaning)}</p><button class="audio-button" type="button" data-speak="${escapeHtml(item.word + ". " + item.example)}">듣기</button></div>`).join("")}</div>
      </div>
      <div class="feed verse-panel"><h2>말씀 한 줄씩 듣기</h2>
        ${bibleLesson.lines.map((line, index) => `<div class="verse-line"><span>${index + 1}. ${escapeHtml(line)}</span><button class="audio-button" type="button" data-speak="${escapeHtml(line)}">듣기</button></div>`).join("")}
        <div class="action-row"><button class="secondary-button" type="button" data-speak="${escapeHtml(bibleLesson.lines.join(" "))}">전체 말씀 듣기</button><button class="primary-button" type="button" data-action="complete-bible">학습 완료 +2</button></div>
      </div>
      ${bibleFeed("최근 성경 학습", state.bibleRecords.slice(0, 6))}
    </section>`;
}

function adminView() {
  return `
    <section class="stack">
      <div class="section-heading"><h2>관리자 화면</h2><span>${state.profile?.role === "admin" ? "관리자" : "선생님"}</span></div>
      <form class="form-panel compact" id="student-form"><h3>아이 등록</h3><label>이름<input name="name" required /></label><label>학년<input name="grade" required /></label><label>반 또는 그룹<input name="groupName" required /></label><button class="primary-button" type="submit">등록</button></form>
      <div class="metric-grid"><div class="metric"><span>전체 아이</span><strong>${state.students.length}명</strong></div><div class="metric"><span>전체 지급 기록</span><strong>${state.transactions.length}건</strong></div><div class="metric"><span>성경 학습</span><strong>${state.bibleRecords.length}건</strong></div><div class="metric"><span>전체 메모</span><strong>${state.notes.length}건</strong></div></div>
      ${transactionFeed("전체 달란트 지급 내역", state.transactions)}
    </section>`;
}

function settingsView() {
  return `
    <section class="stack">
      <form class="form-panel" id="config-form"><h2>Supabase 연결 설정</h2><p class="empty">Project URL과 anon public key만 브라우저에 저장합니다. service_role key는 절대 입력하지 마세요.</p><label>Project URL<input name="url" required placeholder="https://xxxx.supabase.co" value="${escapeHtml(state.config?.url || DEFAULT_SUPABASE_URL)}" /></label><label>Anon public key<input name="anonKey" required placeholder="eyJ..." value="${escapeHtml(state.config?.anonKey || DEFAULT_SUPABASE_ANON_KEY)}" /></label><button class="primary-button" type="submit">설정 저장</button></form>
      <div class="form-panel"><h2>배포 준비</h2><p class="empty">Supabase SQL Editor에서 <strong>supabase/schema.sql</strong>을 실행한 뒤, Auth 사용자와 public.users 프로필을 만들어 로그인합니다.</p></div>
    </section>`;
}

function studentSelect(selectedId) {
  return `<label>아이 선택<select name="studentId">${state.students.map((item) => `<option value="${item.id}" ${item.id === selectedId ? "selected" : ""}>${escapeHtml(item.name)} · ${escapeHtml(item.group_name)}</option>`).join("")}</select></label>`;
}

function transactionFeed(title, items) {
  return `<section class="feed"><h2>${title}</h2>${items.length === 0 ? `<p class="empty">기록이 없습니다.</p>` : ""}${items.map((item) => `<button class="feed-item" type="button" data-student="${item.student_id}"><span><b>${escapeHtml(item.student_name)}</b> · ${escapeHtml(item.reason)}</span><strong>+${item.amount}</strong><small>${formatDate(item.created_at)} · ${escapeHtml(item.teacher_name)}</small>${item.memo ? `<p>${escapeHtml(item.memo)}</p>` : ""}</button>`).join("")}</section>`;
}

function noteFeed(title, items) {
  return `<section class="feed"><h2>${title}</h2>${items.length === 0 ? `<p class="empty">메모가 없습니다.</p>` : ""}${items.map((item) => `<button class="feed-item note" type="button" data-student="${item.student_id}"><span><b>${escapeHtml(item.student_name)}</b></span><small>${formatDate(item.created_at)} · ${escapeHtml(item.teacher_name)}</small><p>${escapeHtml(item.note)}</p></button>`).join("")}</section>`;
}

function bibleFeed(title, items) {
  return `<section class="feed bible-feed"><h2>${title}</h2>${items.length === 0 ? `<p class="empty">성경 학습 기록이 없습니다.</p>` : ""}${items.map((item) => `<button class="feed-item bible-record" type="button" data-student="${item.student_id}"><span><b>${escapeHtml(item.student_name)}</b> · ${escapeHtml(item.lesson_title)}</span><strong>+${item.talents_awarded || 0}</strong><small>${formatDate(item.created_at)} · ${escapeHtml(item.teacher_name)}</small><p>${escapeHtml(item.verse_ref)}</p></button>`).join("")}</section>`;
}

async function signIn(form) {
  if (!state.client) await initSupabase();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const { error } = await state.client.auth.signInWithPassword({ email, password });
  if (error) setMessage(error.message);
}

async function signOut() {
  if (state.client) await state.client.auth.signOut();
  state.session = null;
  state.profile = null;
  state.view = "login";
  render();
}

async function awardTalent(payload) {
  const student = getStudent(payload.studentId);
  const amount = Number(payload.amount);
  if (state.client && state.session) {
    const { error } = await state.client.from("talent_transactions").insert({ student_id: student.id, teacher_id: state.session.user.id, amount, reason: payload.reason, memo: payload.memo || null });
    if (error) { setMessage(error.message); return false; }
    await loadRemoteData();
  } else {
    student.total_talents += amount;
    state.transactions.unshift({ id: crypto.randomUUID(), student_id: student.id, student_name: student.name, teacher_name: currentTeacherName(), amount, reason: payload.reason, memo: payload.memo, created_at: new Date().toISOString() });
  }
  state.selectedStudentId = student.id;
  state.message = `${student.name}에게 ${amount} 달란트를 지급했습니다.`;
  return true;
}

async function addNote(payload) {
  const student = getStudent(payload.studentId);
  if (state.client && state.session) {
    const { error } = await state.client.from("student_notes").insert({ student_id: student.id, teacher_id: state.session.user.id, note: payload.note });
    if (error) { setMessage(error.message); return; }
    await loadRemoteData();
  } else {
    state.notes.unshift({ id: crypto.randomUUID(), student_id: student.id, student_name: student.name, teacher_name: currentTeacherName(), note: payload.note, created_at: new Date().toISOString() });
  }
  state.selectedStudentId = student.id;
  state.message = "메모를 저장했습니다.";
  state.view = "student";
  render();
}

async function createStudent(payload) {
  if (state.client && state.session) {
    const { error } = await state.client.from("students").insert(payload);
    if (error) { setMessage(error.message); return; }
    await loadRemoteData();
  } else {
    state.students.unshift({ id: crypto.randomUUID(), total_talents: 0, is_active: true, ...payload });
  }
  state.message = "아이를 등록했습니다.";
  render();
}

async function completeBibleLesson(studentId) {
  const student = getStudent(studentId);
  const record = { student_id: student.id, teacher_id: state.session?.user?.id || "teacher", lesson_title: bibleLesson.title, verse_ref: bibleLesson.verseRef, completed_items: bibleLesson.words.length + bibleLesson.lines.length, talents_awarded: 2 };
  if (state.client && state.session) {
    const { error } = await state.client.from("bible_learning_records").insert(record);
    if (error) { setMessage(error.message); return; }
    await awardTalent({ studentId: student.id, amount: 2, reason: "성경학습", memo: `${bibleLesson.title} 완료` });
    await loadRemoteData();
  } else {
    state.bibleRecords.unshift({ ...record, id: crypto.randomUUID(), student_name: student.name, teacher_name: currentTeacherName(), created_at: new Date().toISOString() });
    await awardTalent({ studentId: student.id, amount: 2, reason: "성경학습", memo: `${bibleLesson.title} 완료` });
  }
  state.selectedStudentId = student.id;
  state.message = `${student.name}의 성경 학습을 완료하고 2 달란트를 기록했습니다.`;
  state.view = "student";
  render();
}

function speak(text) {
  window.speechSynthesis?.cancel();
  if (!window.speechSynthesis) { setMessage("이 브라우저에서는 음성 재생을 지원하지 않습니다."); return; }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
}

function render() {
  const root = document.getElementById("root");
  const views = { home: homeView, students: studentsView, student: studentView, award: awardView, note: noteView, bible: bibleView, admin: adminView, settings: settingsView, login: loginView };
  if (isConfigured() && !state.session && state.view !== "settings") state.view = "login";
  root.innerHTML = layout((views[state.view] || homeView)());
  bindEvents(root);
}

function bindEvents(root) {
  root.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  root.querySelectorAll("[data-student]").forEach((button) => button.addEventListener("click", () => selectStudent(button.dataset.student)));
  root.querySelectorAll("[data-amount]").forEach((button) => button.addEventListener("click", () => { state.amount = Number(button.dataset.amount); render(); }));
  root.querySelectorAll("[data-speak]").forEach((button) => button.addEventListener("click", () => speak(button.dataset.speak)));
  const logout = root.querySelector("[data-action='logout']");
  if (logout) logout.addEventListener("click", signOut);
  const configForm = root.querySelector("#config-form");
  if (configForm) configForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(configForm);
    saveConfig({ url: String(form.get("url")).trim(), anonKey: String(form.get("anonKey")).trim() });
    state.client = null;
    await initSupabase();
    state.message = "Supabase 설정을 저장했습니다.";
    state.view = state.session ? "home" : "login";
    render();
  });
  const loginForm = root.querySelector("#login-form");
  if (loginForm) loginForm.addEventListener("submit", async (event) => { event.preventDefault(); await signIn(new FormData(loginForm)); });
  const awardForm = root.querySelector("#award-form");
  if (awardForm) {
    awardForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(awardForm);
      const ok = await awardTalent({ studentId: form.get("studentId"), amount: state.amount, reason: form.get("reason"), memo: form.get("memo") });
      if (ok) { state.view = "student"; render(); }
    });
    awardForm.reason.addEventListener("change", () => { state.reason = awardForm.reason.value; });
  }
  const noteForm = root.querySelector("#note-form");
  if (noteForm) noteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(noteForm);
    const note = String(form.get("note") || "").trim();
    if (note) await addNote({ studentId: form.get("studentId"), note });
  });
  const studentForm = root.querySelector("#student-form");
  if (studentForm) studentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(studentForm);
    await createStudent({ name: form.get("name"), grade: form.get("grade"), group_name: form.get("groupName") });
  });
  const completeBible = root.querySelector("[data-action='complete-bible']");
  if (completeBible) completeBible.addEventListener("click", async () => {
    const select = root.querySelector("select[name='studentId']");
    await completeBibleLesson(select?.value || state.selectedStudentId);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  render();
  await initSupabase();
  render();
});



