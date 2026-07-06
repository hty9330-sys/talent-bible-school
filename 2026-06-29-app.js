const CONFIG_KEY = "talent-bible-school:supabase-config";
const DEFAULT_SUPABASE_URL = "https://eesdzgehomzccrrykrqb.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlc2R6Z2Vob216Y2NycnlrcnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2ODc1ODYsImV4cCI6MjA5ODI2MzU4Nn0.DQvThttw0BniIa6zvzM7B2VuqCrPdmpmON4nX3JbOys";
const reasons = ["출석", "성경암송(성경읽기1,성경암송2)", "매일성경읽기", "청소", "봉사활동", "영어성경암송(영어읽기1,영어암송2)", "예배태도", "친구도움", "과제완료", "찬양참여", "특별칭찬", "기타"];
const quickAmounts = [1, 2, 5];
const speechRates = [
  { value: 0.45, label: "천천히" },
  { value: 0.6, label: "보통" },
  { value: 0.75, label: "빠르게" }
];
const roles = { admin: "관리자", teacher: "선생님", guardian: "보호자" };
const bibleLesson = {
  verseRef: "Colossians 1:19-20 (CSB)",
  title: "Bible English Adventure",
  words: [
    { word: "God", sound: "[가-드] /ɡɑːd/", meaning: "하나님", example: "God loves me." },
    { word: "Peace", sound: "[피-스] /piːs/", meaning: "평화, 평안", example: "Jesus gives me peace." },
    { word: "Cross", sound: "[크로-스] /krɔːs/", meaning: "십자가", example: "Jesus died on the cross." },
    { word: "Blood", sound: "[블러드] /blʌd/", meaning: "피", example: "Jesus' blood saves me." },
    { word: "Fullness", sound: "[풀-니스] /ˈfʊlnəs/", meaning: "가득함, 충만함", example: "Jesus has all the fullness." },
    { word: "Reconcile", sound: "[레컨사일] /ˈrekənsaɪl/", meaning: "다시 친구가 되다", example: "Jesus reconciles us to God." }
  ],
  lines: ["For God", "was pleased", "to have all his fullness", "dwell in him,", "and through him", "to reconcile everything,", "by making peace", "through his blood,", "shed on the cross."],
  koLines: ["아버지께서는 모든 충만으로 예수 안에 거하게 하시고", "그의 십자가의 피로 화평을 이루사", "만물이 그로 말미암아 자기와 화목하게 되기를 기뻐하심이라."]
};
const simpleEnglishWords = new Set("a an and are as at be but by can come day do does for from go god good had has have he her him his i in is it jesus let like look love make me my no not of on one our out see she so the their them then there they this to up us was we with you your".split(" "));
const bibleWordGlossary = {
  abide: "머물다, 거하다", above: "위에", according: "~에 따라", afraid: "두려워하는", almighty: "전능하신", angel: "천사", answer: "대답하다", ashamed: "부끄러워하는", bear: "견디다, 지다", believe: "믿다", blessed: "복 받은", blood: "피", bread: "빵, 양식", command: "명령하다", confess: "고백하다", covenant: "약속, 언약", creation: "창조", cross: "십자가", darkness: "어둠", declare: "선포하다", deliver: "구하다, 건지다", dwell: "거하다", earth: "땅", eternal: "영원한", everything: "모든 것", faith: "믿음", father: "아버지", forgive: "용서하다", fullness: "충만함", glory: "영광", grace: "은혜", heaven: "하늘", holy: "거룩한", kingdom: "나라, 왕국", light: "빛", mercy: "자비", mighty: "강한", neighbor: "이웃", peace: "평안", pleased: "기뻐하는", power: "능력", praise: "찬양하다", promise: "약속", reconcile: "화해시키다", rejoice: "기뻐하다", righteous: "의로운", savior: "구원자", shepherd: "목자", spirit: "영", strength: "힘", through: "~을 통하여", truth: "진리", understanding: "이해", wisdom: "지혜", witness: "증인, 증거하다", worship: "예배하다"
};
const state = {
  view: "home", message: "", loading: false, selectedStudentId: "", editingTransactionId: "", amount: 1, reason: "출석", speechRate: 0.6,
  config: loadConfig(), client: null, session: null, profile: null,
  authSubscription: null, students: [], transactions: [], notes: [], bibleRecords: [], users: [], guardianLinks: [], bibleLesson
};
function loadConfig() {
  try {
    const config = JSON.parse(localStorage.getItem(CONFIG_KEY) || "null");
    if (config?.url && config.url !== DEFAULT_SUPABASE_URL) {
      localStorage.removeItem(CONFIG_KEY);
      return null;
    }
    return config;
  } catch {
    return null;
  }
}
function saveConfig(config) { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); state.config = config; }
function isConfigured() { return Boolean((state.config?.url || DEFAULT_SUPABASE_URL) && (state.config?.anonKey || DEFAULT_SUPABASE_ANON_KEY) && window.supabase?.createClient); }
function escapeHtml(value) { return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function formatDate(value) { return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function roleLabel(role) { return roles[role] || "보호자"; }
function isAdmin() { return state.profile?.role === "admin"; }
function isStaff() { return ["admin", "teacher"].includes(state.profile?.role); }
function getStudent(id) { return state.students.find((student) => student.id === id) || state.students[0] || null; }
function currentTeacherName() { return state.profile?.name || state.session?.user?.email || "사용자"; }
function todayTotal() { const today = new Date().toDateString(); return state.transactions.filter((item) => new Date(item.created_at).toDateString() === today).reduce((sum, item) => sum + Number(item.amount || 0), 0); }
function setMessage(message) { state.message = message; render(); }
function setView(view) { state.view = view; state.message = ""; if (view !== "award") state.editingTransactionId = ""; render(); }
function selectStudent(studentId, nextView = "student") { state.selectedStudentId = studentId; setView(nextView); }
function startEditTransaction(transactionId) {
  const transaction = state.transactions.find((item) => item.id === transactionId);
  if (!transaction || !isStaff()) return;
  state.editingTransactionId = transaction.id;
  state.selectedStudentId = transaction.student_id;
  state.amount = Number(transaction.amount || 1);
  state.reason = transaction.reason || reasons[0];
  state.message = "";
  state.view = "award";
  render();
}
function authRedirectMessage() {
  const params = new URLSearchParams(`${window.location.search.replace(/^\?/, "")}&${window.location.hash.replace(/^#/, "")}`);
  return params.get("error_description") || params.get("error") || "";
}
async function initSupabase() {
  if (!isConfigured()) return;
  state.authSubscription?.unsubscribe?.();
  state.client = window.supabase.createClient(state.config?.url || DEFAULT_SUPABASE_URL, state.config?.anonKey || DEFAULT_SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const { data } = await state.client.auth.getSession();
  state.session = data.session;
  const authCode = new URLSearchParams(window.location.search).get("code");
  if (!state.session && authCode) {
    const result = await state.client.auth.exchangeCodeForSession(authCode);
    if (result.data?.session) state.session = result.data.session;
    if (result.error) state.message = result.error.message;
  }
  const redirectError = authRedirectMessage();
  if (redirectError) state.message = redirectError;
  if (state.session) await loadRemoteData();
  const { data: listener } = state.client.auth.onAuthStateChange((_event, session) => {
    state.session = session;
    if (!session) { clearRemoteState(); state.view = "login"; render(); return; }
    window.setTimeout(async () => {
      await loadRemoteData();
      state.view = "home";
      render();
    }, 0);
  });
  state.authSubscription = listener.subscription;
}
function clearRemoteState() { state.profile = null; state.students = []; state.transactions = []; state.notes = []; state.bibleRecords = []; state.users = []; state.guardianLinks = []; state.bibleLesson = bibleLesson; }
async function loadRemoteData() {
  if (!state.client || !state.session) return;
  state.loading = true; render();
  try {
    const userId = state.session.user.id;
    const profileResult = await state.client.from("users").select("id,name,email,role").eq("id", userId).maybeSingle();
    if (profileResult.data) state.profile = profileResult.data;
    const [studentResult, transactionResult, noteResult, bibleResult, lessonResult] = await Promise.all([
      state.client.from("students").select("*").eq("is_active", true).order("name"),
      state.client.from("talent_transactions").select("*, students(name), users(name)").order("created_at", { ascending: false }).limit(80),
      isStaff() ? state.client.from("student_notes").select("*, students(name), users(name)").order("created_at", { ascending: false }).limit(80) : Promise.resolve({ data: [] }),
      state.client.from("bible_learning_records").select("*, students(name), users(name)").order("created_at", { ascending: false }).limit(80),
      state.client.from("weekly_bible_lessons").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle()
    ]);
    state.students = studentResult.data || [];
    state.transactions = (transactionResult.data || []).map(mapTransaction);
    state.notes = (noteResult.data || []).map(mapNote);
    state.bibleRecords = (bibleResult.data || []).map(mapBibleRecord);
    state.bibleLesson = normalizeBibleLesson(lessonResult.data);
    if (isAdmin()) {
      const [usersResult, linksResult] = await Promise.all([
        state.client.from("users").select("id,name,email,role").order("name"),
        state.client.from("student_guardians").select("*").order("created_at", { ascending: false })
      ]);
      state.users = usersResult.data || [];
      state.guardianLinks = linksResult.data || [];
    } else {
      state.users = [];
      state.guardianLinks = [];
    }
    state.selectedStudentId = state.students[0]?.id || "";
  } catch (error) {
    state.message = error.message || "로그인 정보를 불러오지 못했습니다.";
  } finally {
    state.loading = false;
  }
}
function mapTransaction(item) { return { ...item, student_name: item.students?.name || "아이", teacher_name: item.users?.name || "선생님" }; }
function mapNote(item) { return { ...item, student_name: item.students?.name || "아이", teacher_name: item.users?.name || "선생님" }; }
function mapBibleRecord(item) { return { ...item, student_name: item.students?.name || "아이", teacher_name: item.users?.name || "선생님" }; }
function currentBibleLesson() { return state.bibleLesson || bibleLesson; }
function splitVerseLines(text) { return String(text || "").split(/\n+|(?<=[.!?;])\s+/).map((line) => line.trim()).filter(Boolean); }
function sentenceCase(word) { return word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ""; }
function buildWordCard(word) {
  const clean = word.toLowerCase();
  return { word: sentenceCase(clean), sound: "듣기 버튼으로 발음 확인", meaning: bibleWordGlossary[clean] || "부모님과 함께 뜻을 찾아보자", example: clean };
}
function buildWordsFromVerse(text) {
  const seen = new Set();
  const fallbackSeen = new Set();
  const words = (String(text || "").match(/[A-Za-z][A-Za-z'-]*/g) || [])
    .map((word) => word.toLowerCase().replace(/^'+|'+$/g, ""))
    .filter((word) => word.length > 2);
  const candidates = words
    .filter((word) => word.length > 2 && !simpleEnglishWords.has(word))
    .filter((word) => {
      if (seen.has(word)) return false;
      seen.add(word);
      return true;
    })
    .sort((a, b) => {
      const knownDiff = Number(Boolean(bibleWordGlossary[b])) - Number(Boolean(bibleWordGlossary[a]));
      return knownDiff || b.length - a.length;
    });
  const fallback = candidates.length ? candidates : words.filter((word) => {
    if (fallbackSeen.has(word)) return false;
    fallbackSeen.add(word);
    return true;
  });
  return fallback.slice(0, 16).map(buildWordCard);
}
function normalizeBibleLesson(row) {
  if (!row?.verse_text) return bibleLesson;
  const lines = splitVerseLines(row.verse_text);
  const koLines = splitVerseLines(row.verse_ko || "");
  return {
    verseRef: row.verse_ref || "이번 주 말씀",
    title: row.title || "Bible English Adventure",
    words: buildWordsFromVerse(row.verse_text),
    lines: lines.length ? lines : [row.verse_text],
    koLines
  };
}
function layout(content) {
  const modeText = isConfigured() ? state.session ? `${escapeHtml(currentTeacherName())} · ${roleLabel(state.profile?.role)}` : "Supabase 연결됨" : "설정 필요";
  return `<div class="app-shell"><header class="topbar"><div><p class="eyebrow">달란트 성경학교</p><h1>아이들의 말씀과 성장을 함께 기록해요</h1></div><div class="topbar-actions">${state.session ? `<button class="ghost-button" type="button" data-action="logout">로그아웃</button>` : `<button class="ghost-button" type="button" data-view="login">로그인</button>`}${isAdmin() ? `<button class="ghost-button" type="button" data-view="settings">설정</button>` : ""}</div></header><div class="notice">${modeText}${state.loading ? " · 불러오는 중" : ""}</div>${state.message ? `<div class="toast">${escapeHtml(state.message)}</div>` : ""}<main>${content}</main><nav class="bottom-nav" aria-label="주요 메뉴">${navButton("home", "홈")}${navButton("students", "아이")}${isStaff() ? navButton("award", "지급") : ""}${navButton("bible", "성경")}${isAdmin() ? navButton("admin", "관리") : ""}</nav></div>`;
}
function navButton(view, label) { return `<button type="button" class="${state.view === view ? "active" : ""}" data-view="${view}">${label}</button>`; }
function homeView() {
  return `<section class="stack"><div class="hero-panel"><span>오늘 지급한 달란트</span><strong>${todayTotal()}</strong><p>${isStaff() ? "칭찬과 암송, 출석 달란트를 한곳에 기록합니다." : "연결된 아이의 달란트 기록을 확인합니다."}</p></div><div class="quick-grid"><button type="button" data-view="students">아이 목록</button>${isStaff() ? `<button type="button" data-view="award">달란트 지급</button>` : ""}<button type="button" data-view="bible">성경 학습</button>${isStaff() ? `<button type="button" data-view="note">메모 작성</button>` : ""}</div>${transactionFeed("최근 달란트 지급", state.transactions.slice(0, 4))}${isStaff() ? noteFeed("최근 작성된 메모", state.notes.slice(0, 4)) : ""}</section>`;
}
function loginView() {
  if (!isConfigured()) return settingsView();
  return `<section class="login-screen inline-login"><form class="login-card" id="login-form"><p class="eyebrow">로그인</p><h1>선생님과 보호자가 함께 사용합니다</h1><button class="google-button" type="button" data-action="google-login">Google로 로그인</button><div class="divider">또는 이메일 로그인</div><label>이메일<input name="email" type="email" required autocomplete="email" /></label><label>비밀번호<input name="password" type="password" required autocomplete="current-password" /></label><button class="primary-button" type="submit">이메일로 로그인</button><p class="empty">처음 Google로 로그인하면 보호자로 등록됩니다. 선생님 권한은 관리자가 변경합니다.</p></form></section>`;
}
function studentsView() { return `<section class="stack"><div class="section-heading"><h2>${isStaff() ? "아이 목록" : "내 아이"}</h2><span>${state.students.length}명</span></div><div class="student-list">${state.students.length === 0 ? `<p class="empty">${isStaff() ? "등록된 아이가 없습니다." : "아직 연결된 아이가 없습니다. 관리자에게 보호자 연결을 요청하세요."}</p>` : state.students.map((student) => `<button class="student-row" type="button" data-student="${student.id}"><span><strong>${escapeHtml(student.name)}</strong><small>${escapeHtml(student.grade)} · ${escapeHtml(student.group_name)}</small></span><b>${student.total_talents} 달란트</b></button>`).join("")}</div></section>`; }
function studentView() {
  const student = getStudent(state.selectedStudentId); if (!student) return emptyStudentsView();
  return `<section class="stack"><div class="profile-panel"><p>${escapeHtml(student.grade)} · ${escapeHtml(student.group_name)}</p><h2>${escapeHtml(student.name)}</h2><strong>${student.total_talents} 달란트</strong></div>${isStaff() ? `<div class="action-row"><button class="primary-button" type="button" data-view="award">달란트 지급</button><button class="secondary-button" type="button" data-view="bible">성경 학습</button></div>` : ""}${transactionFeed("전체 달란트 지급 기록", state.transactions.filter((item) => item.student_id === student.id))}${isStaff() ? noteFeed("선생님 메모 기록", state.notes.filter((item) => item.student_id === student.id)) : ""}</section>`;
}
function emptyStudentsView() { return `<section class="stack"><div class="form-panel"><h2>등록된 아이가 없습니다</h2><p class="empty">${isStaff() ? "관리 탭에서 아이를 먼저 등록하세요." : "보호자 계정은 관리자가 아이와 연결해야 기록을 볼 수 있습니다."}</p></div></section>`; }
function awardView() {
  if (!isStaff()) return permissionView();
  const editing = state.transactions.find((item) => item.id === state.editingTransactionId);
  const student = getStudent(editing?.student_id || state.selectedStudentId);
  if (!student) return emptyStudentsView();
  const selectedAmount = Number(state.amount || editing?.amount || 1);
  const selectedReason = state.reason || editing?.reason || reasons[0];
  const allowedAmounts = isAdmin() ? [1, 2, 5] : [1, 2];
  return `<section class="stack"><form class="form-panel" id="award-form"><h2>${editing ? "달란트 지급 수정" : "달란트 지급"}</h2>${studentSelect(student.id)}<div class="amount-grid">${allowedAmounts.map((amount) => `<button class="${selectedAmount === amount ? "selected" : ""}" type="button" data-amount="${amount}">${amount} 달란트</button>`).join("")}</div><label>지급 사유<select name="reason">${reasons.map((reason) => `<option ${reason === selectedReason ? "selected" : ""}>${reason}</option>`).join("")}</select></label><label>메모<textarea name="memo" placeholder="칭찬 내용이나 상황을 적어주세요.">${escapeHtml(editing?.memo || "")}</textarea></label><div class="action-row"><button class="secondary-button" type="button" data-view="award">취소</button><button class="primary-button" type="submit">${editing ? "수정 저장" : "지급 저장"}</button></div></form>${transactionFeed("지급 내역 수정", state.transactions)}</section>`;
}
function noteView() { if (!isStaff()) return permissionView(); const student = getStudent(state.selectedStudentId); if (!student) return emptyStudentsView(); return `<form class="form-panel" id="note-form"><h2>메모 작성</h2>${studentSelect(student.id)}<label>관찰 메모<textarea name="note" required placeholder="예배 태도, 친구 관계, 암송, 보호자 전달 사항 등을 기록해주세요."></textarea></label><button class="primary-button" type="submit">메모 저장</button></form>`; }
function bibleView() { const student = getStudent(state.selectedStudentId); const lesson = currentBibleLesson(); return `<section class="stack bible-view"><div class="section-heading"><h2>성경 영어 학습</h2><span>${escapeHtml(lesson.verseRef)}</span></div><div class="form-panel bible-lesson-panel">${student ? studentSelect(student.id) : `<p class="empty">아이를 먼저 등록하거나 연결하세요.</p>`}<p class="eyebrow">${escapeHtml(lesson.title)}</p><h2>오늘의 말씀과 단어</h2><p class="empty">관리자가 입력한 이번 주 말씀에서 어려운 단어를 자동으로 뽑습니다.</p><div class="word-grid">${lesson.words.map((item) => `<div class="word-card"><div><strong>${escapeHtml(item.word)}</strong><small>${escapeHtml(item.sound)}</small></div><p>${escapeHtml(item.meaning)}</p><button class="audio-button" type="button" data-speak="${escapeHtml(item.word + ". " + item.example)}">듣기</button></div>`).join("")}</div></div><div class="feed verse-panel"><h2>영어 말씀 듣기</h2><div class="speed-control"><span>읽기 속도</span>${speechRates.map((rate) => `<button class="${state.speechRate === rate.value ? "active" : ""}" type="button" data-speech-rate="${rate.value}">${rate.label}</button>`).join("")}</div>${lesson.lines.map((line, index) => `<div class="verse-line"><span>${index + 1}. ${escapeHtml(line)}</span><button class="audio-button" type="button" data-speak="${escapeHtml(line)}">듣기</button></div>`).join("")}${lesson.koLines?.length ? `<div class="translation-panel"><h3>한글 개역개정 해석</h3>${lesson.koLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div>` : ""}<button class="secondary-button" type="button" data-speak="${escapeHtml(lesson.lines.join(" "))}">전체 말씀 듣기</button></div></section>`; }
function adminView() {
  if (!state.session) return loginView(); if (!isAdmin()) return permissionView();
  const guardians = state.users.filter((user) => user.role === "guardian");
  const lesson = currentBibleLesson();
  return `<section class="stack"><div class="section-heading"><h2>관리자 화면</h2><span>권한 및 보호자 연결</span></div><form class="form-panel compact" id="bible-lesson-form"><h3>이번 주 성경 구절</h3><label>제목<input name="title" required value="${escapeHtml(lesson.title)}" /></label><label>본문 위치<input name="verseRef" required value="${escapeHtml(lesson.verseRef)}" /></label><label>성경 구절 영어 본문<textarea name="verseText" required placeholder="English Bible verse text">${escapeHtml(lesson.lines.join(" "))}</textarea></label><label>한글 개역개정 해석<textarea name="verseKo" required placeholder="개역개정 한글 말씀">${escapeHtml((lesson.koLines || []).join(" "))}</textarea></label><p class="empty">저장하면 성경 화면의 말씀, 한글 해석, 어려운 단어, 원어민 읽기 문장이 자동으로 바뀝니다.</p><button class="primary-button" type="submit">이번 주 말씀 저장</button></form><form class="form-panel compact" id="student-form"><h3>아이 등록</h3><label>이름<input name="name" required /></label><label>학년<input name="grade" required /></label><label>반 또는 그룹<input name="groupName" required /></label><button class="primary-button" type="submit">등록</button></form><div class="feed"><h2>사용자 권한</h2>${state.users.map((user) => `<div class="user-row"><span><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.email)} · ${roleLabel(user.role)}</small></span><select data-user-role="${user.id}">${Object.entries(roles).map(([value, label]) => `<option value="${value}" ${user.role === value ? "selected" : ""}>${label}</option>`).join("")}</select></div>`).join("")}</div><form class="form-panel compact" id="guardian-link-form"><h3>보호자와 아이 연결</h3><label>아이<select name="studentId">${state.students.map((student) => `<option value="${student.id}">${escapeHtml(student.name)} · ${escapeHtml(student.group_name)}</option>`).join("")}</select></label><label>보호자<select name="guardianId">${guardians.map((user) => `<option value="${user.id}">${escapeHtml(user.name)} · ${escapeHtml(user.email)}</option>`).join("")}</select></label><label>관계<input name="relationship" value="보호자" /></label><button class="primary-button" type="submit">연결 저장</button></form><div class="feed"><h2>아이 관리</h2>${state.students.length === 0 ? `<p class="empty">등록된 아이가 없습니다.</p>` : state.students.map((student) => `<div class="student-row"><span><strong>${escapeHtml(student.name)}</strong><small>${escapeHtml(student.grade)} · ${escapeHtml(student.group_name)}${guardianText(student.id)}</small></span><button class="secondary-button" type="button" data-deactivate-student="${student.id}">삭제</button></div>`).join("")}</div><div class="metric-grid"><div class="metric"><span>전체 아이</span><strong>${state.students.length}명</strong></div><div class="metric"><span>사용자</span><strong>${state.users.length}명</strong></div><div class="metric"><span>보호자 연결</span><strong>${state.guardianLinks.length}건</strong></div><div class="metric"><span>성경 학습</span><strong>${state.bibleRecords.length}건</strong></div></div></section>`;
}
function guardianText(studentId) { const links = state.guardianLinks.filter((link) => link.student_id === studentId); if (!links.length) return ""; const names = links.map((link) => state.users.find((user) => user.id === link.guardian_id)?.name || "보호자").join(", "); return ` · 보호자: ${escapeHtml(names)}`; }
function permissionView() { return `<section class="stack"><div class="form-panel"><h2>접근 권한이 없습니다</h2><p class="empty">이 화면은 관리자 또는 선생님 권한이 필요합니다.</p></div></section>`; }
function settingsView() { if (!isAdmin()) return permissionView(); return `<section class="stack"><form class="form-panel" id="config-form"><h2>Supabase 연결 설정</h2><p class="empty">Project URL과 anon public key만 브라우저에 저장합니다. service_role key는 절대 입력하지 마세요.</p><label>Project URL<input name="url" required value="${escapeHtml(state.config?.url || DEFAULT_SUPABASE_URL)}" /></label><label>Anon public key<input name="anonKey" required value="${escapeHtml(state.config?.anonKey || DEFAULT_SUPABASE_ANON_KEY)}" /></label><button class="primary-button" type="submit">설정 저장</button></form></section>`; }
function studentSelect(selectedId) { return `<label>아이 선택<select name="studentId">${state.students.map((item) => `<option value="${item.id}" ${item.id === selectedId ? "selected" : ""}>${escapeHtml(item.name)} · ${escapeHtml(item.group_name)}</option>`).join("")}</select></label>`; }
function transactionFeed(title, items) { return `<section class="feed"><h2>${title}</h2>${items.length === 0 ? `<p class="empty">기록이 없습니다.</p>` : ""}${items.map((item) => `<div class="feed-item"><button class="feed-main" type="button" data-student="${item.student_id}"><span><b>${escapeHtml(item.student_name)}</b> · ${escapeHtml(item.reason)}</span><strong>+${item.amount}</strong><small>${formatDate(item.created_at)} · ${escapeHtml(item.teacher_name)}</small>${item.memo ? `<p>${escapeHtml(item.memo)}</p>` : ""}</button>${isStaff() ? `<div class="feed-actions"><button class="secondary-button edit-button" type="button" data-edit-transaction="${item.id}">수정</button><button class="secondary-button delete-button" type="button" data-delete-transaction="${item.id}">삭제</button></div>` : ""}</div>`).join("")}</section>`; }
function noteFeed(title, items) { return `<section class="feed"><h2>${title}</h2>${items.length === 0 ? `<p class="empty">메모가 없습니다.</p>` : ""}${items.map((item) => `<button class="feed-item note" type="button" data-student="${item.student_id}"><span><b>${escapeHtml(item.student_name)}</b></span><small>${formatDate(item.created_at)} · ${escapeHtml(item.teacher_name)}</small><p>${escapeHtml(item.note)}</p></button>`).join("")}</section>`; }
function cleanAuthUrl() { if (window.location.hash || window.location.search) window.history.replaceState({}, document.title, window.location.pathname); }
async function signIn(form) { if (!state.client) await initSupabase(); state.message = "로그인 중입니다."; render(); const email = String(form.get("email") || "").trim(); const password = String(form.get("password") || ""); const { data, error } = await state.client.auth.signInWithPassword({ email, password }); if (error) return setMessage(error.message); state.session = data.session; await loadRemoteData(); state.message = "로그인했습니다."; state.view = "home"; render(); }
async function signInWithGoogle() { if (!state.client) await initSupabase(); state.message = "Google 로그인 화면으로 이동합니다."; render(); const redirectTo = `${window.location.origin}${window.location.pathname}`; const { error } = await state.client.auth.signInWithOAuth({ provider: "google", options: { redirectTo, queryParams: { prompt: "select_account" } } }); if (error) setMessage(error.message); }
async function signOut() { window.speechSynthesis?.cancel(); if (state.client) await state.client.auth.signOut({ scope: "local" }); state.session = null; cleanAuthUrl(); clearRemoteState(); state.message = "로그아웃했습니다."; state.view = "login"; render(); }
async function awardTalent(payload) { const student = getStudent(payload.studentId); if (!student) { setMessage("아이를 먼저 등록하세요."); return false; } if (!isStaff()) { setMessage("선생님 권한이 필요합니다."); return false; } const amount = Number(payload.amount); const allowedAmounts = isAdmin() ? [1, 2, 5] : [1, 2]; if (!allowedAmounts.includes(amount)) { setMessage(`지급 가능한 달란트는 ${allowedAmounts.join(", ")} 뿐입니다.`); return false; } const { error } = await state.client.from("talent_transactions").insert({ student_id: student.id, teacher_id: state.session.user.id, amount, reason: payload.reason, memo: payload.memo || null }); if (error) { setMessage(error.message); return false; } await loadRemoteData(); state.selectedStudentId = student.id; state.message = `${student.name}에게 ${amount} 달란트를 지급했습니다.`; return true; }
async function updateTalentTransaction(payload) {
  if (!isStaff()) { setMessage("선생님 권한이 필요합니다."); return false; }
  const transaction = state.transactions.find((item) => item.id === payload.transactionId);
  const student = getStudent(payload.studentId);
  if (!transaction || !student) { setMessage("수정할 지급 기록을 찾지 못했습니다."); return false; }
  const amount = Number(payload.amount);
  const allowedAmounts = isAdmin() ? [1, 2, 5] : [1, 2];
  if (!allowedAmounts.includes(amount)) { setMessage(`지급 가능한 달란트는 ${allowedAmounts.join(", ")} 뿐입니다.`); return false; }
  const { error } = await state.client
    .from("talent_transactions")
    .update({ student_id: student.id, amount, reason: payload.reason, memo: payload.memo || null })
    .eq("id", transaction.id);
  if (error) { setMessage(error.message); return false; }
  state.editingTransactionId = "";
  await loadRemoteData();
  state.selectedStudentId = student.id;
  state.message = `${student.name}의 달란트 지급 기록을 수정했습니다.`;
  return true;
}
async function deleteTalentTransaction(transactionId) {
  if (!isStaff()) return setMessage("선생님 권한이 필요합니다.");
  const transaction = state.transactions.find((item) => item.id === transactionId);
  if (!transaction) return setMessage("삭제할 지급 기록을 찾지 못했습니다.");
  const label = `${transaction.student_name} · ${transaction.reason} +${transaction.amount}`;
  if (!window.confirm(`${label} 지급 기록을 삭제할까요? 학생의 총 달란트도 함께 조정됩니다.`)) return;
  const { error } = await state.client.from("talent_transactions").delete().eq("id", transaction.id);
  if (error) return setMessage(error.message);
  await loadRemoteData();
  state.selectedStudentId = transaction.student_id;
  state.message = "달란트 지급 기록을 삭제했습니다.";
  state.view = "award";
  render();
}
async function addNote(payload) { if (!isStaff()) return setMessage("선생님 권한이 필요합니다."); const student = getStudent(payload.studentId); if (!student) return setMessage("아이를 먼저 등록하세요."); const { error } = await state.client.from("student_notes").insert({ student_id: student.id, teacher_id: state.session.user.id, note: payload.note }); if (error) return setMessage(error.message); await loadRemoteData(); state.selectedStudentId = student.id; state.message = "메모를 저장했습니다."; state.view = "student"; render(); }
async function createStudent(payload) { if (!isAdmin()) return setMessage("관리자만 아이를 등록할 수 있습니다."); const { error } = await state.client.from("students").insert(payload); if (error) return setMessage(error.message); await loadRemoteData(); state.message = "아이를 등록했습니다."; render(); }
async function deactivateStudent(studentId) { if (!isAdmin()) return setMessage("관리자만 아이를 삭제할 수 있습니다."); const student = getStudent(studentId); if (!window.confirm(`${student?.name || "아이"}를 목록에서 삭제할까요? 기록은 보존되고 아이만 비활성화됩니다.`)) return; const { error } = await state.client.from("students").update({ is_active: false }).eq("id", studentId); if (error) return setMessage(error.message); await loadRemoteData(); state.message = `${student?.name || "아이"}를 목록에서 삭제했습니다.`; state.view = "admin"; render(); }
async function updateUserRole(userId, role) { if (!isAdmin()) return; const { error } = await state.client.from("users").update({ role }).eq("id", userId); if (error) return setMessage(error.message); await loadRemoteData(); setMessage("사용자 권한을 변경했습니다."); }
async function linkGuardian(payload) { if (!isAdmin()) return; if (!payload.student_id || !payload.guardian_id) return setMessage("아이와 보호자를 선택하세요."); const { error } = await state.client.from("student_guardians").upsert(payload); if (error) return setMessage(error.message); await loadRemoteData(); setMessage("보호자 연결을 저장했습니다."); }
async function updateWeeklyBibleLesson(payload) { if (!isAdmin()) return setMessage("관리자만 성경 구절을 업데이트할 수 있습니다."); const { error: updateError } = await state.client.from("weekly_bible_lessons").update({ is_active: false }).eq("is_active", true); if (updateError) return setMessage(updateError.message); const { error } = await state.client.from("weekly_bible_lessons").insert({ title: payload.title, verse_ref: payload.verseRef, verse_text: payload.verseText, verse_ko: payload.verseKo, created_by: state.session.user.id, is_active: true }); if (error) return setMessage(error.message); await loadRemoteData(); state.message = "이번 주 성경 구절을 저장했습니다."; state.view = "bible"; render(); }
async function completeBibleLesson(studentId) { if (!isStaff()) return setMessage("선생님 권한이 필요합니다."); const student = getStudent(studentId); if (!student) return setMessage("아이를 먼저 등록하세요."); const lesson = currentBibleLesson(); const { error } = await state.client.rpc("complete_bible_lesson", { p_student_id: student.id, p_lesson_title: lesson.title, p_verse_ref: lesson.verseRef, p_completed_items: lesson.words.length + lesson.lines.length, p_talents_awarded: 2 }); if (error) return setMessage(error.message); await loadRemoteData(); state.selectedStudentId = student.id; state.message = `${student.name}의 성경 학습을 완료하고 2 달란트를 기록했습니다.`; state.view = "student"; render(); }
function speak(text) { window.speechSynthesis?.cancel(); if (!window.speechSynthesis) return setMessage("이 브라우저에서는 음성 재생을 지원하지 않습니다."); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "en-US"; utterance.rate = state.speechRate; window.speechSynthesis.speak(utterance); }
function render() { const root = document.getElementById("root"); const views = { home: homeView, students: studentsView, student: studentView, award: awardView, note: noteView, bible: bibleView, admin: adminView, settings: settingsView, login: loginView }; if (isConfigured() && !state.session) state.view = "login"; if (!isStaff() && ["award", "note"].includes(state.view)) state.view = "home"; if (!isAdmin() && ["admin", "settings"].includes(state.view)) state.view = state.session ? "home" : "login"; root.innerHTML = layout((views[state.view] || homeView)()); bindEvents(root); }
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./service-worker.js?v=20260630-07").catch(() => {});
}
function bindEvents(root) {
  root.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  root.querySelectorAll("[data-student]").forEach((button) => button.addEventListener("click", () => selectStudent(button.dataset.student)));
  root.querySelectorAll("[data-amount]").forEach((button) => button.addEventListener("click", () => { state.amount = Number(button.dataset.amount); render(); }));
  root.querySelectorAll("[data-speech-rate]").forEach((button) => button.addEventListener("click", () => { state.speechRate = Number(button.dataset.speechRate); render(); }));
  root.querySelectorAll("[data-speak]").forEach((button) => button.addEventListener("click", () => speak(button.dataset.speak)));
  root.querySelector("[data-action='logout']")?.addEventListener("click", signOut);
  root.querySelector("[data-action='google-login']")?.addEventListener("click", signInWithGoogle);
  root.querySelector("#config-form")?.addEventListener("submit", async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); saveConfig({ url: String(form.get("url")).trim(), anonKey: String(form.get("anonKey")).trim() }); state.client = null; await initSupabase(); state.message = "Supabase 설정을 저장했습니다."; state.view = state.session ? "home" : "login"; render(); });
  root.querySelector("#login-form")?.addEventListener("submit", async (event) => { event.preventDefault(); await signIn(new FormData(event.currentTarget)); });
  root.querySelector("#award-form")?.addEventListener("submit", async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const payload = { studentId: form.get("studentId"), amount: state.amount, reason: form.get("reason"), memo: form.get("memo") }; const ok = state.editingTransactionId ? await updateTalentTransaction({ ...payload, transactionId: state.editingTransactionId }) : await awardTalent(payload); if (ok) { state.view = "student"; render(); } });
  root.querySelector("#award-form select[name='studentId']")?.addEventListener("change", (event) => { state.selectedStudentId = event.target.value; });
  root.querySelector("#award-form select[name='reason']")?.addEventListener("change", (event) => { state.reason = event.target.value; });
  root.querySelector("#note-form")?.addEventListener("submit", async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const note = String(form.get("note") || "").trim(); if (note) await addNote({ studentId: form.get("studentId"), note }); });
  root.querySelector("#student-form")?.addEventListener("submit", async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); await createStudent({ name: form.get("name"), grade: form.get("grade"), group_name: form.get("groupName") }); });
  root.querySelector("#bible-lesson-form")?.addEventListener("submit", async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); await updateWeeklyBibleLesson({ title: String(form.get("title") || "").trim(), verseRef: String(form.get("verseRef") || "").trim(), verseText: String(form.get("verseText") || "").trim(), verseKo: String(form.get("verseKo") || "").trim() }); });
  root.querySelector("#guardian-link-form")?.addEventListener("submit", async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); await linkGuardian({ student_id: form.get("studentId"), guardian_id: form.get("guardianId"), relationship: form.get("relationship") || "보호자" }); });
  root.querySelectorAll("[data-user-role]").forEach((select) => select.addEventListener("change", () => updateUserRole(select.dataset.userRole, select.value)));
  root.querySelectorAll("[data-deactivate-student]").forEach((button) => button.addEventListener("click", async () => deactivateStudent(button.dataset.deactivateStudent)));
  root.querySelectorAll("[data-edit-transaction]").forEach((button) => button.addEventListener("click", () => startEditTransaction(button.dataset.editTransaction)));
  root.querySelectorAll("[data-delete-transaction]").forEach((button) => button.addEventListener("click", () => deleteTalentTransaction(button.dataset.deleteTransaction)));
}
document.addEventListener("DOMContentLoaded", async () => { registerServiceWorker(); render(); await initSupabase(); render(); });
