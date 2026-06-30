(() => {
  if (typeof state === "undefined") return;

  function currentIsoWeekKey() {
    const date = new Date();
    const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
    return String(utc.getUTCFullYear()) + "-" + String(week).padStart(2, "0");
  }

  function weeklyBibleRecord(studentId) {
    const week = currentIsoWeekKey();
    return state.bibleRecords.find((record) => record.student_id === studentId && record.lesson_week === week);
  }

  function weeklyBibleCompleted(studentId) {
    return Boolean(weeklyBibleRecord(studentId));
  }

  function selectedBibleStudent() {
    return getStudent(state.selectedStudentId) || state.students[0] || null;
  }

  homeView = function patchedHomeView() {
    const doneCount = state.students.filter((student) => weeklyBibleCompleted(student.id)).length;
    const totalCount = state.students.length;
    return `<section class="stack"><div class="hero-panel"><span>오늘 지급한 달란트</span><strong>${todayTotal()}</strong><p>${isStaff() ? "칭찬과 암송, 출석 달란트를 한곳에 기록합니다." : "연결된 아이의 달란트 기록을 확인합니다."}</p></div><div class="form-panel compact"><div class="section-heading"><h2>이번 주 성경 영어 학습</h2><span>${doneCount}/${totalCount}명 완료</span></div><p class="empty">보호자와 선생님은 연결된 아이의 주간 학습 완료를 기록하고 2달란트를 지급할 수 있습니다.</p><button class="primary-button" type="button" data-view="bible">성경 학습으로 이동</button></div><div class="quick-grid"><button type="button" data-view="students">아이 목록</button>${isStaff() ? `<button type="button" data-view="award">달란트 지급</button>` : ""}<button type="button" data-view="bible">성경 학습</button>${isStaff() ? `<button type="button" data-view="note">메모 작성</button>` : ""}</div>${transactionFeed("최근 달란트 지급", state.transactions.slice(0, 4))}${isStaff() ? noteFeed("최근 작성된 메모", state.notes.slice(0, 4)) : ""}</section>`;
  };

  bibleView = function patchedBibleView() {
    const student = selectedBibleStudent();
    const lesson = currentBibleLesson();
    const completed = student ? weeklyBibleCompleted(student.id) : false;
    const completedRecord = student ? weeklyBibleRecord(student.id) : null;
    const selectLabel = state.profile?.role === "guardian" ? "보호자로 연결된 아이 선택" : "아이 선택";
    return `<section class="stack bible-view"><div class="section-heading"><h2>성경 영어 학습</h2><span>${escapeHtml(lesson.verseRef)}</span></div><div class="form-panel bible-lesson-panel">${student ? studentSelect(student.id).replace("아이 선택", selectLabel) : `<p class="empty">아이를 먼저 등록하거나 연결하세요.</p>`}<p class="eyebrow">${escapeHtml(lesson.title)}</p><h2>오늘의 말씀과 단어</h2><p class="empty">관리자가 입력한 이번 주 말씀에서 어려운 단어를 자동으로 뽑습니다.</p><div class="word-grid">${lesson.words.map((item) => `<div class="word-card"><div><strong>${escapeHtml(item.word)}</strong><small>${escapeHtml(item.sound)}</small></div><p>${escapeHtml(item.meaning)}</p><button class="audio-button" type="button" data-speak="${escapeHtml(item.word + ". " + item.example)}">듣기</button></div>`).join("")}</div></div><div class="form-panel compact"><h2>이번 주 학습 완료</h2>${student ? `<p class="empty">${escapeHtml(student.name)}의 성경 영어 학습을 한 주에 한 번 완료 처리합니다.</p><div class="metric-grid"><div class="metric"><span>이번 주 상태</span><strong>${completed ? "완료" : "미완료"}</strong></div><div class="metric"><span>지급 달란트</span><strong>${completed ? "+2" : "+2 예정"}</strong></div></div>${completed ? `<p class="empty">이미 이번 주 학습 완료가 기록되었습니다. ${completedRecord ? formatDate(completedRecord.created_at) : ""}</p>` : `<button class="primary-button" type="button" data-complete-weekly-bible="${student.id}">학습 완료하고 2달란트 지급</button>`}` : `<p class="empty">연결된 아이가 없어서 완료 처리할 수 없습니다.</p>`}</div><div class="feed verse-panel"><h2>영어 말씀 듣기</h2><div class="speed-control"><span>읽기 속도</span>${speechRates.map((rate) => `<button class="${state.speechRate === rate.value ? "active" : ""}" type="button" data-speech-rate="${rate.value}">${rate.label}</button>`).join("")}</div>${lesson.lines.map((line, index) => `<div class="verse-line"><span>${index + 1}. ${escapeHtml(line)}</span><button class="audio-button" type="button" data-speak="${escapeHtml(line)}">듣기</button></div>`).join("")}${lesson.koLines?.length ? `<div class="translation-panel"><h3>한글 개역개정 해석</h3>${lesson.koLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div>` : ""}<button class="secondary-button" type="button" data-speak="${escapeHtml(lesson.lines.join(" "))}">전체 말씀 듣기</button></div></section>`;
  };

  async function completeWeeklyBibleLesson(studentId) {
    const student = getStudent(studentId);
    if (!student) return setMessage("연결된 아이를 먼저 선택하세요.");
    const lesson = currentBibleLesson();
    const { data, error } = await state.client.rpc("complete_weekly_bible_lesson", {
      p_student_id: student.id,
      p_lesson_title: lesson.title,
      p_verse_ref: lesson.verseRef,
      p_completed_items: lesson.words.length + lesson.lines.length,
      p_talents_awarded: 2
    });
    if (error) return setMessage(error.message);
    await loadRemoteData();
    const result = Array.isArray(data) ? data[0] : data;
    state.selectedStudentId = student.id;
    state.message = result?.already_completed ? "이미 이번 주 성경 학습 완료가 기록되어 있습니다." : `${student.name}의 이번 주 성경 학습을 완료하고 2달란트를 지급했습니다.`;
    state.view = "bible";
    render();
  }

  const previousBindEventsForWeeklyBible = bindEvents;
  bindEvents = function patchedWeeklyBibleBindEvents(root) {
    previousBindEventsForWeeklyBible(root);
    root.querySelector("select[name='studentId']")?.addEventListener("change", (event) => {
      state.selectedStudentId = event.target.value;
      render();
    });
    root.querySelectorAll("[data-complete-weekly-bible]").forEach((button) => {
      button.addEventListener("click", () => completeWeeklyBibleLesson(button.dataset.completeWeeklyBible));
    });
  };
})();
