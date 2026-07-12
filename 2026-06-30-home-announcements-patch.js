(() => {
  if (typeof state === "undefined") return;

  state.announcements = state.announcements || [];
  state.editingTeacherLink = state.editingTeacherLink || null;
  state.editingAnnouncementId = state.editingAnnouncementId || "";

  function todayLabel() {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long"
    }).format(new Date());
  }

  function isoWeekKeyFromDateForAnnouncements(value) {
    // 2026-07-06: 일요일 시작 주간 기준으로 통일 (weekly-bible-patch와 동일 로직, Asia/Seoul)
    const date = value ? new Date(value) : new Date();
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date).reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
    const seoulDate = new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
    seoulDate.setDate(seoulDate.getDate() - seoulDate.getDay());
    const year = seoulDate.getFullYear();
    const month = String(seoulDate.getMonth() + 1).padStart(2, "0");
    const day = String(seoulDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function weeklyBibleCompletedForHome(studentId) {
    const week = isoWeekKeyFromDateForAnnouncements();
    return state.transactions.some((item) => item.student_id === studentId
      && item.reason === "성경학습"
      && Number(item.amount) === 2
      && isoWeekKeyFromDateForAnnouncements(item.created_at) === week);
  }

  function announcementById(id) {
    return state.announcements.find((item) => item.id === id);
  }

  function userName(id, fallback) {
    return state.users.find((user) => user.id === id)?.name || fallback;
  }

  function studentName(id) {
    const student = state.students.find((item) => item.id === id);
    return student ? `${escapeHtml(student.name)} · ${escapeHtml(student.group_name)}` : "아이";
  }

  function teacherName(id) {
    const teacher = state.users.find((user) => user.id === id);
    return teacher ? `${escapeHtml(teacher.name)} · ${escapeHtml(teacher.email)}` : "선생님";
  }

  function announcementFeed() {
    const activeItems = state.announcements.filter((item) => item.is_active !== false).slice(0, 5);
    return `<section class="feed announcement-feed"><h2>교회 소식</h2>${activeItems.length === 0 ? `<p class="empty">등록된 교회 소식이 없습니다.</p>` : ""}${activeItems.map((item) => `<div class="feed-item announcement-item"><span><b>${escapeHtml(item.title)}</b></span><small>${formatDate(item.created_at)} · ${escapeHtml(userName(item.created_by, "관리자"))}</small><p style="white-space:pre-wrap;">${escapeHtml(item.body)}</p></div>`).join("")}</section>`;
  }

  function teacherLinkPanel() {
    const editing = state.editingTeacherLink;
    return `<div class="feed"><h2>선생님 연결 현황</h2>${state.teacherLinks.length === 0 ? `<p class="empty">저장된 선생님 연결이 없습니다.</p>` : ""}${state.teacherLinks.map((link) => `<div class="student-row teacher-link-row"><span><strong>${studentName(link.student_id)}</strong><small>${teacherName(link.teacher_id)}</small></span><div class="feed-actions"><button class="secondary-button edit-button" type="button" data-edit-teacher-link-student="${link.student_id}" data-edit-teacher-link-teacher="${link.teacher_id}">수정</button><button class="secondary-button delete-button" type="button" data-delete-teacher-link-student="${link.student_id}" data-delete-teacher-link-teacher="${link.teacher_id}">해제</button></div></div>`).join("")}${editing ? `<p class="empty">선택한 연결을 수정 중입니다. 위의 선생님 연결 저장 폼에서 아이와 선생님을 바꾼 뒤 저장하세요.</p>` : ""}</div>`;
  }

  function announcementAdminPanel() {
    const editing = announcementById(state.editingAnnouncementId);
    const title = editing?.title || "";
    const body = editing?.body || "";
    const checked = editing?.is_active === false ? "" : " checked";
    return `<form class="form-panel compact" id="church-announcement-form"><h3>${editing ? "교회 소식 수정" : "교회 소식 등록"}</h3><label>제목<input name="title" required value="${escapeHtml(title)}" /></label><label>내용<textarea name="body" required placeholder="홈 화면에 게시할 교회 소식을 입력하세요.">${escapeHtml(body)}</textarea></label><label class="check-row"><input name="isActive" type="checkbox"${checked} /> 홈 화면에 게시</label><div class="action-row">${editing ? `<button class="secondary-button" type="button" data-cancel-announcement-edit>취소</button>` : `<span></span>`}<button class="primary-button" type="submit">${editing ? "소식 수정 저장" : "소식 게시"}</button></div></form><div class="feed"><h2>교회 소식 관리</h2>${state.announcements.length === 0 ? `<p class="empty">등록된 교회 소식이 없습니다.</p>` : ""}${state.announcements.map((item) => `<div class="feed-item announcement-item"><span><b>${escapeHtml(item.title)}</b> · ${item.is_active === false ? "숨김" : "게시중"}</span><small>${formatDate(item.created_at)} · ${escapeHtml(userName(item.created_by, "관리자"))}</small><p style="white-space:pre-wrap;">${escapeHtml(item.body)}</p><div class="feed-actions"><button class="secondary-button edit-button" type="button" data-edit-announcement="${item.id}">수정</button><button class="secondary-button delete-button" type="button" data-delete-announcement="${item.id}">삭제</button></div></div>`).join("")}</div>`;
  }

  const previousClearRemoteState = clearRemoteState;
  clearRemoteState = function patchedAnnouncementClearRemoteState() {
    previousClearRemoteState();
    state.announcements = [];
    state.editingTeacherLink = null;
    state.editingAnnouncementId = "";
  };

  const previousLoadRemoteData = loadRemoteData;
  loadRemoteData = async function patchedAnnouncementLoadRemoteData() {
    await previousLoadRemoteData();
    if (!state.client || !state.session) return;
    try {
      const query = state.client
        .from("church_announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      const result = isAdmin() ? await query : await query.eq("is_active", true);
      if (result.data) state.announcements = result.data;
    } catch {
      state.announcements = [];
    }
  };

  layout = function patchedChurchLayout(content) {
    const modeText = isConfigured() ? state.session ? `${escapeHtml(currentTeacherName())} · ${roleLabel(state.profile?.role)}` : "Supabase 연결됨" : "설정 필요";
    return `<div class="app-shell"><header class="topbar"><div><div class="church-title"><img class="church-logo" src="./assets/2026-06-30-deulsaram-header-logo.png" alt="들사람교회" /></div><p class="eyebrow">달란트 성경학교</p><h1>아이들의 말씀과 성장을 함께 기록해요</h1></div><div class="topbar-actions">${state.session ? `<button class="ghost-button" type="button" data-action="logout">로그아웃</button>` : `<button class="ghost-button" type="button" data-view="login">로그인</button>`}<button class="ghost-button" type="button" data-view="settings">설정</button></div></header><div class="notice">${modeText}${state.loading ? " · 불러오는 중" : ""}</div>${state.message ? `<div class="toast">${escapeHtml(state.message)}</div>` : ""}<main>${content}</main><nav class="bottom-nav" aria-label="주요 메뉴">${navButton("home", "홈")}${navButton("students", "아이")}${isStaff() ? navButton("award", "지급") : ""}${navButton("bible", "학습")}${isAdmin() ? navButton("admin", "관리") : ""}</nav></div>`;
  };

  homeView = function patchedAnnouncementHomeView() {
    const doneCount = state.students.filter((student) => weeklyBibleCompletedForHome(student.id)).length;
    const totalCount = state.students.length;
    return `<section class="stack"><div class="date-strip"><span>${todayLabel()}</span></div><div class="home-hero-image" style="margin:10px 0;text-align:center;"><img src="./assets/2026-07-07-home-image.jpg?v=20260707-05" alt="달란트 성경학교" style="width:100%;max-width:520px;border-radius:14px;" /></div>${announcementFeed()}<div class="hero-panel"><span>오늘 지급한 달란트</span><strong>${todayTotal()}</strong><p>${isStaff() ? "칭찬과 암송, 출석 달란트를 한곳에 기록합니다." : "연결된 아이의 달란트 기록을 확인합니다."}</p></div><div class="form-panel compact"><div class="section-heading"><h2>이번 주 성경 영어 학습</h2><span>${doneCount}/${totalCount}명 완료</span></div><p class="empty">보호자와 선생님은 연결된 아이의 주간 학습 완료를 기록하고 2달란트를 지급할 수 있습니다.</p><button class="primary-button" type="button" data-view="bible">성경 학습으로 이동</button></div><div class="quick-grid"><button type="button" data-view="students">아이 목록</button>${isStaff() ? `<button type="button" data-view="award">달란트 지급</button>` : ""}<button type="button" data-view="bible">성경 학습</button>${isStaff() ? `<button type="button" data-view="note">메모 작성</button>` : ""}</div>${transactionFeed("최근 달란트 지급", state.transactions.slice(0, 4))}${isStaff() ? noteFeed("최근 작성된 메모", state.notes.slice(0, 4)) : ""}</section>`;
  };

  const previousAdminView = adminView;
  adminView = function patchedAnnouncementAdminView() {
    let html = previousAdminView();
    if (!isAdmin()) return html;
    html = html.replace(`</div><form class="form-panel compact" id="bible-lesson-form"`, `</div>${announcementAdminPanel()}<form class="form-panel compact" id="bible-lesson-form"`);
    html = html.replace(`</form><form class="form-panel compact" id="guardian-link-form"`, `</form>${teacherLinkPanel()}<form class="form-panel compact" id="guardian-link-form"`);
    return html;
  };

  async function saveTeacherLink(payload) {
    if (!isAdmin()) return;
    if (!payload.student_id || !payload.teacher_id) return setMessage("아이와 선생님을 선택하세요.");
    const editing = state.editingTeacherLink;
    if (editing && (editing.student_id !== payload.student_id || editing.teacher_id !== payload.teacher_id)) {
      const deleteResult = await state.client
        .from("student_teachers")
        .delete()
        .eq("student_id", editing.student_id)
        .eq("teacher_id", editing.teacher_id);
      if (deleteResult.error) return setMessage(deleteResult.error.message);
    }
    const { error } = await state.client.from("student_teachers").upsert(payload);
    if (error) return setMessage(error.message);
    state.editingTeacherLink = null;
    await loadRemoteData();
    state.message = "선생님 연결을 저장했습니다.";
    render();
  }

  async function deleteTeacherLink(payload) {
    if (!isAdmin()) return;
    const { error } = await state.client
      .from("student_teachers")
      .delete()
      .eq("student_id", payload.student_id)
      .eq("teacher_id", payload.teacher_id);
    if (error) return setMessage(error.message);
    state.editingTeacherLink = null;
    await loadRemoteData();
    state.message = "선생님 연결을 해제했습니다.";
    render();
  }

  async function saveAnnouncement(payload) {
    if (!isAdmin()) return;
    const row = {
      title: payload.title,
      body: payload.body,
      is_active: payload.is_active,
      created_by: state.session.user.id
    };
    const editing = announcementById(state.editingAnnouncementId);
    const result = editing
      ? await state.client.from("church_announcements").update({
          title: row.title,
          body: row.body,
          is_active: row.is_active,
          updated_at: new Date().toISOString()
        }).eq("id", editing.id)
      : await state.client.from("church_announcements").insert(row);
    if (result.error) return setMessage(result.error.message);
    state.editingAnnouncementId = "";
    await loadRemoteData();
    state.message = "교회 소식을 저장했습니다.";
    render();
  }

  async function deleteAnnouncement(id) {
    if (!isAdmin()) return;
    const target = announcementById(id);
    if (!window.confirm(`"${target ? target.title : "이 소식"}"을(를) 삭제할까요? 삭제하면 되돌릴 수 없습니다.`)) return;
    const { error } = await state.client.from("church_announcements").delete().eq("id", id);
    if (error) return setMessage(error.message);
    if (state.editingAnnouncementId === id) state.editingAnnouncementId = "";
    await loadRemoteData();
    state.message = "교회 소식을 삭제했습니다.";
    render();
  }

  const previousBindEvents = bindEvents;
  bindEvents = function patchedAnnouncementBindEvents(root) {
    previousBindEvents(root);

    const teacherForm = root.querySelector("#teacher-link-form");
    teacherForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const form = new FormData(event.currentTarget);
      await saveTeacherLink({ student_id: form.get("studentId"), teacher_id: form.get("teacherId") });
    }, true);
    if (state.editingTeacherLink && teacherForm) {
      const studentSelect = teacherForm.querySelector("select[name='studentId']");
      const teacherSelect = teacherForm.querySelector("select[name='teacherId']");
      if (studentSelect) studentSelect.value = state.editingTeacherLink.student_id;
      if (teacherSelect) teacherSelect.value = state.editingTeacherLink.teacher_id;
      const submit = teacherForm.querySelector("button[type='submit']");
      if (submit) submit.textContent = "선생님 연결 수정 저장";
    }

    root.querySelectorAll("[data-edit-teacher-link-student]").forEach((button) => {
      button.addEventListener("click", () => {
        state.editingTeacherLink = {
          student_id: button.dataset.editTeacherLinkStudent,
          teacher_id: button.dataset.editTeacherLinkTeacher
        };
        render();
      });
    });
    root.querySelectorAll("[data-delete-teacher-link-student]").forEach((button) => {
      button.addEventListener("click", () => deleteTeacherLink({
        student_id: button.dataset.deleteTeacherLinkStudent,
        teacher_id: button.dataset.deleteTeacherLinkTeacher
      }));
    });

    root.querySelector("#church-announcement-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      await saveAnnouncement({
        title: String(form.get("title") || "").trim(),
        body: String(form.get("body") || "").trim(),
        is_active: form.get("isActive") === "on"
      });
    });
    root.querySelector("[data-cancel-announcement-edit]")?.addEventListener("click", () => {
      state.editingAnnouncementId = "";
      render();
    });
    root.querySelectorAll("[data-edit-announcement]").forEach((button) => {
      button.addEventListener("click", () => {
        state.editingAnnouncementId = button.dataset.editAnnouncement;
        render();
      });
    });
    root.querySelectorAll("[data-delete-announcement]").forEach((button) => {
      button.addEventListener("click", () => deleteAnnouncement(button.dataset.deleteAnnouncement));
    });
  };
})();
