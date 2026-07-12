(() => {
  if (typeof state === "undefined") return;

  state.teacherLinks = state.teacherLinks || [];

  const originalClearRemoteState = clearRemoteState;
  clearRemoteState = function patchedClearRemoteState() {
    originalClearRemoteState();
    state.teacherLinks = [];
  };

  loadRemoteData = async function patchedLoadRemoteData() {
    if (!state.client || !state.session) return;
    state.loading = true;
    render();
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
        const [usersResult, linksResult, teacherLinksResult] = await Promise.all([
          state.client.from("users").select("id,name,email,role").order("name"),
          state.client.from("student_guardians").select("*").order("created_at", { ascending: false }),
          state.client.from("student_teachers").select("*").order("created_at", { ascending: false })
        ]);
        state.users = usersResult.data || [];
        state.guardianLinks = linksResult.data || [];
        state.teacherLinks = teacherLinksResult.data || [];
      } else {
        state.users = [];
        state.guardianLinks = [];
        state.teacherLinks = [];
      }
      state.selectedStudentId = state.students[0]?.id || "";
    } catch (error) {
      state.message = error.message || "로그인 정보를 불러오지 못했습니다.";
    } finally {
      state.loading = false;
    }
  };

  studentsView = function patchedStudentsView() {
    return `<section class="stack"><div class="section-heading"><h2>${isStaff() ? "담당 아이" : "내 아이"}</h2><span>${state.students.length}명</span></div><div class="student-list" style="max-height:min(560px,68vh);overflow-y:auto;overscroll-behavior:contain;padding-right:6px;">${state.students.length === 0 ? `<p class="empty">${isStaff() ? "아직 선생님과 연결된 아이가 없습니다. 관리자가 선생님-아이 연결을 저장해야 합니다." : "아직 연결된 아이가 없습니다. 관리자에게 보호자 연결을 요청하세요."}</p>` : state.students.map((student) => `<button class="student-row" type="button" data-student="${student.id}"><span><strong>${escapeHtml(student.name)}</strong><small>${escapeHtml(student.grade)} · ${escapeHtml(student.group_name)}</small></span><b>${student.total_talents} 달란트</b></button>`).join("")}</div></section>`;
  };

  emptyStudentsView = function patchedEmptyStudentsView() {
    return `<section class="stack"><div class="form-panel"><h2>연결된 아이가 없습니다</h2><p class="empty">${isStaff() ? "관리자가 선생님-아이 연결을 저장하면 담당 아이가 표시됩니다." : "보호자 계정은 관리자가 아이와 연결해야 기록을 볼 수 있습니다."}</p></div></section>`;
  };

  function teacherText(studentId) {
    const links = state.teacherLinks.filter((link) => link.student_id === studentId);
    if (!links.length) return " · 담당 선생님 없음";
    const names = links.map((link) => state.users.find((user) => user.id === link.teacher_id)?.name || "선생님").join(", ");
    return ` · 선생님: ${escapeHtml(names)}`;
  }

  adminView = function patchedAdminView() {
    if (!state.session) return loginView();
    if (!isAdmin()) return permissionView();
    const guardians = state.users.filter((user) => user.role === "guardian");
    const teachers = state.users.filter((user) => user.role === "teacher");
    const lesson = currentBibleLesson();
    return `<section class="stack"><div class="section-heading"><h2>관리자 화면</h2><span>권한 및 아이 연결</span></div><form class="form-panel compact" id="bible-lesson-form"><h3>이번 주 성경 구절</h3><label>제목<input name="title" required value="${escapeHtml(lesson.title)}" /></label><label>본문 위치<input name="verseRef" required value="${escapeHtml(lesson.verseRef)}" /></label><label>성경 구절 영어 본문<textarea name="verseText" required placeholder="English Bible verse text">${escapeHtml(lesson.lines.join(" "))}</textarea></label><label>한글 개역개정 해석<textarea name="verseKo" required placeholder="개역개정 한글 말씀">${escapeHtml((lesson.koLines || []).join(" "))}</textarea></label><p class="empty">저장하면 성경 화면의 말씀, 한글 해석, 어려운 단어, 원어민 읽기 문장이 자동으로 바뀝니다.</p><button class="primary-button" type="submit">이번 주 말씀 저장</button></form><form class="form-panel compact" id="student-form"><h3>아이 등록</h3><label>이름<input name="name" required /></label><label>학년<input name="grade" required /></label><label>반 또는 그룹<input name="groupName" required /></label><button class="primary-button" type="submit">등록</button></form><div class="feed"><h2>사용자 권한</h2>${state.users.map((user) => `<div class="user-row"><span><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.email)} · ${roleLabel(user.role)}</small></span><select data-user-role="${user.id}">${Object.entries(roles).map(([value, label]) => `<option value="${value}" ${user.role === value ? "selected" : ""}>${label}</option>`).join("")}</select></div>`).join("")}</div><form class="form-panel compact" id="teacher-link-form"><h3>선생님과 아이 연결</h3><label>아이<select name="studentId">${state.students.map((student) => `<option value="${student.id}">${escapeHtml(student.name)} · ${escapeHtml(student.group_name)}</option>`).join("")}</select></label><label>선생님<select name="teacherId">${teachers.map((user) => `<option value="${user.id}">${escapeHtml(user.name)} · ${escapeHtml(user.email)}</option>`).join("")}</select></label><button class="primary-button" type="submit">선생님 연결 저장</button></form><form class="form-panel compact" id="guardian-link-form"><h3>보호자와 아이 연결</h3><label>아이<select name="studentId">${state.students.map((student) => `<option value="${student.id}">${escapeHtml(student.name)} · ${escapeHtml(student.group_name)}</option>`).join("")}</select></label><label>보호자<select name="guardianId">${guardians.map((user) => `<option value="${user.id}">${escapeHtml(user.name)} · ${escapeHtml(user.email)}</option>`).join("")}</select></label><label>관계<input name="relationship" value="보호자" /></label><button class="primary-button" type="submit">보호자 연결 저장</button></form><div class="feed"><h2>아이 관리</h2>${state.students.length === 0 ? `<p class="empty">등록된 아이가 없습니다.</p>` : state.students.map((student) => `<div class="student-row"><span><strong>${escapeHtml(student.name)}</strong><small>${escapeHtml(student.grade)} · ${escapeHtml(student.group_name)}${teacherText(student.id)}${guardianText(student.id)}</small></span><button class="secondary-button" type="button" data-deactivate-student="${student.id}">삭제</button></div>`).join("")}</div><div class="metric-grid"><div class="metric"><span>전체 아이</span><strong>${state.students.length}명</strong></div><div class="metric"><span>사용자</span><strong>${state.users.length}명</strong></div><div class="metric"><span>선생님 연결</span><strong>${state.teacherLinks.length}건</strong></div><div class="metric"><span>보호자 연결</span><strong>${state.guardianLinks.length}건</strong></div></div></section>`;
  };

  async function linkTeacher(payload) {
    if (!isAdmin()) return;
    if (!payload.student_id || !payload.teacher_id) return setMessage("아이와 선생님을 선택하세요.");
    const { error } = await state.client.from("student_teachers").upsert(payload);
    if (error) return setMessage(error.message);
    await loadRemoteData();
    setMessage("선생님 연결을 저장했습니다.");
  }

  const originalBindEvents = bindEvents;
  bindEvents = function patchedBindEvents(root) {
    originalBindEvents(root);
    root.querySelector("#teacher-link-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      await linkTeacher({ student_id: form.get("studentId"), teacher_id: form.get("teacherId") });
    });
  };
})();
