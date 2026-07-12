(() => {
  // 메모(student_notes) 기능 보강
  //  1) 7일 지난 메모는 화면에 표시하지 않음 (실제 삭제는 서버 pg_cron이 매일 처리)
  //  2) 메모 작성자(또는 관리자)는 수정/삭제 가능 (RLS 정책도 함께 적용됨)
  if (typeof state === "undefined" || typeof noteFeed !== "function") return;

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  function isFresh(item) {
    if (!item || !item.created_at) return true;
    return Date.now() - new Date(item.created_at).getTime() < WEEK_MS;
  }
  function canManage(item) {
    const uid = state.session && state.session.user && state.session.user.id;
    return (typeof isAdmin === "function" && isAdmin()) || (uid && item.teacher_id === uid);
  }

  // ---- noteFeed 재정의: 7일 필터 + 작성자/관리자 수정·삭제 버튼 ----
  noteFeed = function noteFeedWithActions(title, items) {
    const fresh = (items || []).filter(isFresh);
    const body = fresh.length === 0
      ? `<p class="empty">메모가 없습니다.</p>`
      : fresh.map((item) => {
          const actions = canManage(item)
            ? `<div class="feed-actions"><button class="secondary-button edit-button" type="button" data-edit-note="${item.id}">수정</button><button class="secondary-button delete-button" type="button" data-delete-note="${item.id}">삭제</button></div>`
            : "";
          return `<div class="feed-item note"><button class="feed-main" type="button" data-student="${item.student_id}"><span><b>${escapeHtml(item.student_name)}</b></span><small>${formatDate(item.created_at)} · ${escapeHtml(item.teacher_name)}</small><p>${escapeHtml(item.note)}</p></button>${actions}</div>`;
        }).join("");
    return `<section class="feed"><h2>${title}</h2>${body}</section>`;
  };

  async function deleteNoteById(id) {
    const { error } = await state.client.from("student_notes").delete().eq("id", id);
    if (error) { setMessage(error.message); return; }
    await loadRemoteData();
    setMessage("메모를 삭제했습니다.");
  }
  async function updateNoteById(id, text) {
    const t = String(text || "").trim();
    if (!t) { setMessage("메모 내용을 입력하세요."); return; }
    const { error } = await state.client.from("student_notes").update({ note: t }).eq("id", id);
    if (error) { setMessage(error.message); return; }
    await loadRemoteData();
    setMessage("메모를 수정했습니다.");
  }

  // ---- 수정/삭제 클릭 처리 (위임, 1회 바인딩) ----
  if (!window.__noteEditBound) {
    window.__noteEditBound = true;
    document.addEventListener("click", async (event) => {
      const delBtn = event.target.closest && event.target.closest("[data-delete-note]");
      const editBtn = event.target.closest && event.target.closest("[data-edit-note]");
      const saveBtn = event.target.closest && event.target.closest("[data-save-note]");
      const cancelBtn = event.target.closest && event.target.closest("[data-cancel-note]");

      if (delBtn) {
        event.preventDefault();
        if (!window.confirm("이 메모를 삭제할까요?")) return;
        await deleteNoteById(delBtn.getAttribute("data-delete-note"));
        return;
      }
      if (editBtn) {
        event.preventDefault();
        const id = editBtn.getAttribute("data-edit-note");
        const note = (state.notes || []).find((n) => String(n.id) === String(id));
        const item = editBtn.closest(".feed-item");
        if (!note || !item) return;
        item.innerHTML =
          `<textarea class="note-edit-input" style="width:100%;min-height:72px;padding:8px;border:1px solid #d9d4c7;border-radius:8px;box-sizing:border-box;font-size:15px;">${escapeHtml(note.note)}</textarea>` +
          `<div class="feed-actions"><button class="secondary-button" type="button" data-cancel-note="1">취소</button><button class="primary-button" type="button" data-save-note="${id}">저장</button></div>`;
        const ta = item.querySelector(".note-edit-input");
        if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
        return;
      }
      if (saveBtn) {
        event.preventDefault();
        const id = saveBtn.getAttribute("data-save-note");
        const item = saveBtn.closest(".feed-item");
        const ta = item && item.querySelector(".note-edit-input");
        await updateNoteById(id, ta ? ta.value : "");
        return;
      }
      if (cancelBtn) {
        event.preventDefault();
        if (typeof render === "function") render();
        return;
      }
    });
  }
})();
