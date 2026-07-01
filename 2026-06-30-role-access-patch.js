(() => {
  if (typeof state === "undefined") return;

  const fixedAdminEmail = "hty9330@gmail.com";
  const roleEntries = [
    ["visitor", "방문객"],
    ["guardian", "보호자"],
    ["teacher", "선생님"],
    ["admin", "관리자"]
  ];

  Object.keys(roles).forEach((key) => delete roles[key]);
  roleEntries.forEach(([value, label]) => {
    roles[value] = label;
  });

  roleLabel = function patchedRoleLabel(role) {
    return roles[role] || roles.visitor;
  };

  function normalizedRole() {
    return state.profile?.role || "visitor";
  }

  function isVisitor() {
    return normalizedRole() === "visitor";
  }

  isAdmin = function patchedIsAdmin() {
    return normalizedRole() === "admin";
  };

  isStaff = function patchedIsStaff() {
    return ["admin", "teacher"].includes(normalizedRole());
  };

  function canUseApprovedTabs() {
    return ["guardian", "teacher", "admin"].includes(normalizedRole());
  }

  function canAccessView(view) {
    if (!state.session) return ["login", "home"].includes(view);
    if (view === "settings") return isAdmin();
    if (["home", "login"].includes(view)) return true;
    if (["students", "student", "bible"].includes(view)) return canUseApprovedTabs();
    if (["award", "note"].includes(view)) return isStaff();
    if (view === "admin") return isAdmin();
    return false;
  }

  function visitorHomeView() {
    const today = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long"
    }).format(new Date());
    const announcements = (state.announcements || []).filter((item) => item.is_active !== false).slice(0, 5);
    return `<section class="stack"><div class="date-strip"><span>${today}</span></div><section class="feed announcement-feed"><h2>교회 소식</h2>${announcements.length === 0 ? `<p class="empty">등록된 교회 소식이 없습니다.</p>` : ""}${announcements.map((item) => `<div class="feed-item announcement-item"><span><b>${escapeHtml(item.title)}</b></span><small>${formatDate(item.created_at)}</small><p>${escapeHtml(item.body)}</p></div>`).join("")}</section><div class="hero-panel"><span>관리자 승인 대기</span><strong>방문객</strong><p>관리자가 보호자, 선생님, 관리자 권한을 부여하면 아이 기록과 성경 학습 탭을 사용할 수 있습니다.</p></div></section>`;
  }

  const previousHomeViewForRoles = homeView;
  homeView = function patchedRoleHomeView() {
    return isVisitor() ? visitorHomeView() : previousHomeViewForRoles();
  };

  layout = function patchedRoleLayout(content) {
    const modeText = isConfigured()
      ? state.session
        ? `${escapeHtml(currentTeacherName())} · ${roleLabel(state.profile?.role)}`
        : "Supabase 연결됨"
      : "설정 필요";
    const navItems = [["home", "홈"]];
    if (canUseApprovedTabs()) {
      navItems.push(["students", "아이"]);
      if (isStaff()) navItems.push(["award", "지급"]);
      navItems.push(["bible", "학습"]);
      if (isAdmin()) navItems.push(["admin", "관리"]);
    }
    return `<div class="app-shell"><header class="topbar"><div><div class="church-title"><img class="church-logo" src="./assets/2026-06-30-deulsaram-header-logo.png" alt="들사람교회" /></div><p class="eyebrow">달란트 성경학교</p><h1>아이들의 말씀과 성장을 함께 기록해요</h1></div><div class="topbar-actions">${state.session ? `<button class="ghost-button" type="button" data-action="logout">로그아웃</button>` : `<button class="ghost-button" type="button" data-view="login">로그인</button>`}${isAdmin() ? `<button class="ghost-button" type="button" data-view="settings">설정</button>` : ""}</div></header><div class="notice">${modeText}${state.loading ? " · 불러오는 중" : ""}</div>${state.message ? `<div class="toast">${escapeHtml(state.message)}</div>` : ""}<main>${content}</main><nav class="bottom-nav" aria-label="주요 메뉴">${navItems.map(([view, label]) => navButton(view, label)).join("")}</nav></div>`;
  };

  const previousSetViewForRoles = setView;
  setView = function patchedRoleSetView(view) {
    if (!canAccessView(view)) {
      state.view = "home";
      state.message = "관리자가 권한을 부여한 뒤 사용할 수 있습니다.";
      render();
      return;
    }
    previousSetViewForRoles(view);
  };

  const previousSelectStudentForRoles = selectStudent;
  selectStudent = function patchedRoleSelectStudent(studentId, nextView = "student") {
    if (!canAccessView(nextView)) {
      state.view = "home";
      state.message = "관리자가 권한을 부여한 뒤 사용할 수 있습니다.";
      render();
      return;
    }
    previousSelectStudentForRoles(studentId, nextView);
  };

  const previousLoadRemoteDataForRoles = loadRemoteData;
  loadRemoteData = async function patchedRoleLoadRemoteData() {
    await previousLoadRemoteDataForRoles();
    if (!isVisitor()) return;
    state.students = [];
    state.transactions = [];
    state.notes = [];
    state.bibleRecords = [];
    state.users = [];
    state.guardianLinks = [];
    state.teacherLinks = [];
  };

  const previousUpdateUserRoleForRoles = updateUserRole;
  updateUserRole = async function patchedRoleUpdateUserRole(userId, role) {
    const user = state.users.find((item) => item.id === userId);
    if (user?.email === fixedAdminEmail && role !== "admin") {
      state.message = "최초 관리자 계정은 관리자 권한에서 변경할 수 없습니다.";
      render();
      return;
    }
    await previousUpdateUserRoleForRoles(userId, role);
  };

  render = function patchedRoleRender() {
    const root = document.getElementById("root");
    const views = { home: homeView, students: studentsView, student: studentView, award: awardView, note: noteView, bible: bibleView, admin: adminView, settings: settingsView, login: loginView };
    if (isConfigured() && !state.session) state.view = "login";
    if (state.session && !canAccessView(state.view)) state.view = "home";
    root.innerHTML = layout((views[state.view] || homeView)());
    bindEvents(root);
  };

  const previousBindEventsForRoles = bindEvents;
  bindEvents = function patchedRoleBindEvents(root) {
    previousBindEventsForRoles(root);
    state.users
      .filter((user) => user.email === fixedAdminEmail)
      .forEach((user) => {
        const select = root.querySelector(`[data-user-role="${user.id}"]`);
        if (!select) return;
        select.value = "admin";
        select.disabled = true;
        select.title = "최초 관리자 계정은 변경할 수 없습니다.";
      });
  };
})();
