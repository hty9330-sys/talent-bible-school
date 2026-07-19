(() => {
  // 2026-07-12 학습자료 업로드/다운로드
  //  - 관리 탭: 관리자가 파일(모든 형식) 업로드 + 목록/삭제
  //  - 학습 탭: 교사 이상(선생님·관리자)이 다운로드 (비공개 버킷 + 서명 URL)
  //  - Supabase Storage 버킷 'learning-materials' + public.learning_materials 테이블 사용
  if (typeof state === "undefined" || typeof adminView !== "function" || typeof bibleView !== "function") return;

  const BUCKET = "learning-materials";
  state.learningMaterials = state.learningMaterials || [];

  function lmIsAdmin() { return typeof isAdmin === "function" && isAdmin(); }
  function lmIsStaff() { return typeof isStaff === "function" && isStaff(); }
  function uuidLike() {
    try { return crypto.randomUUID(); } catch (e) { return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }
  }
  function formatBytes(n) {
    const v = Number(n || 0);
    if (v < 1024) return `${v} B`;
    if (v < 1048576) return `${Math.round(v / 1024)} KB`;
    return `${(v / 1048576).toFixed(1)} MB`;
  }
  function materialById(id) { return (state.learningMaterials || []).find((m) => m.id === id); }

  async function loadMaterials() {
    if (!state.client || !state.session || !lmIsStaff()) { state.learningMaterials = []; return; }
    try {
      const result = await state.client.from("learning_materials").select("*").order("created_at", { ascending: false });
      state.learningMaterials = result.data || [];
    } catch {
      state.learningMaterials = [];
    }
  }

  async function uploadMaterial(file) {
    if (!lmIsAdmin()) { setMessage("관리자만 업로드할 수 있습니다."); return; }
    if (!file) { setMessage("파일을 선택하세요."); return; }
    const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
    const path = `${uuidLike()}${ext}`;
    setMessage(`'${file.name}' 업로드 중입니다...`);
    const up = await state.client.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false
    });
    if (up.error) { setMessage(up.error.message); return; }
    const ins = await state.client.from("learning_materials").insert({
      storage_path: path,
      file_name: file.name,
      content_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: state.session.user.id
    });
    if (ins.error) {
      await state.client.storage.from(BUCKET).remove([path]); // 메타 저장 실패 시 파일 롤백
      setMessage(ins.error.message);
      return;
    }
    await loadMaterials();
    state.message = `'${file.name}' 업로드를 완료했습니다.`;
    render();
  }

  async function downloadMaterial(id) {
    const m = materialById(id);
    if (!m) return;
    const { data, error } = await state.client.storage.from(BUCKET).createSignedUrl(m.storage_path, 120, { download: m.file_name });
    if (error) { setMessage(error.message); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function deleteMaterial(id) {
    if (!lmIsAdmin()) { setMessage("관리자만 삭제할 수 있습니다."); return; }
    const m = materialById(id);
    if (!m) return;
    if (!window.confirm(`'${m.file_name}' 파일을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    const rm = await state.client.storage.from(BUCKET).remove([m.storage_path]);
    if (rm.error) { setMessage(rm.error.message); return; }
    const del = await state.client.from("learning_materials").delete().eq("id", id);
    if (del.error) { setMessage(del.error.message); return; }
    await loadMaterials();
    state.message = "학습자료를 삭제했습니다.";
    render();
  }

  function materialsAdminPanel() {
    const items = state.learningMaterials || [];
    const list = items.length === 0
      ? `<p class="empty">업로드된 자료가 없습니다.</p>`
      : items.map((m) => `<div class="feed-item"><span><b>${escapeHtml(m.file_name)}</b><small>${formatDate(m.created_at)} · ${formatBytes(m.size_bytes)}</small></span><div class="feed-actions"><button class="secondary-button" type="button" data-lm-download="${m.id}">다운로드</button><button class="secondary-button delete-button" type="button" data-lm-delete="${m.id}">삭제</button></div></div>`).join("");
    return `<form class="form-panel compact" id="lm-upload-form"><h3>학습자료 업로드</h3><p class="empty">파일을 올리면 학습 탭에서 선생님·관리자가 다운로드할 수 있습니다. (파일당 최대 50MB)</p><label>파일 선택<input type="file" name="file" /></label><button class="primary-button" type="submit">업로드</button></form><div class="feed"><h2>업로드된 학습자료</h2>${list}</div>`;
  }

  function materialsDownloadPanel() {
    const items = state.learningMaterials || [];
    const list = items.length === 0
      ? `<p class="empty">아직 업로드된 학습자료가 없습니다.</p>`
      : items.map((m) => `<div class="feed-item"><span><b>${escapeHtml(m.file_name)}</b><small>${formatDate(m.created_at)} · ${formatBytes(m.size_bytes)}</small></span><div class="feed-actions"><button class="secondary-button" type="button" data-lm-download="${m.id}">다운로드</button></div></div>`).join("");
    return `<div class="form-panel compact"><div class="section-heading"><h2>📎 학습자료 다운로드</h2><span>${items.length}개</span></div>${list}</div>`;
  }

  // 관리 탭에 업로드/관리 패널 주입 (관리자)
  const previousAdminViewForMaterials = adminView;
  adminView = function materialsAdminView() {
    let html = previousAdminViewForMaterials();
    if (typeof html === "string" && lmIsAdmin()) {
      html = html.replace("</section>", `${materialsAdminPanel()}</section>`);
    }
    return html;
  };

  // 학습 탭에 다운로드 패널 주입 (교사 이상)
  const previousBibleViewForMaterials = bibleView;
  bibleView = function materialsBibleView() {
    let html = previousBibleViewForMaterials();
    if (typeof html === "string" && lmIsStaff()) {
      html = html.replace("</section>", `${materialsDownloadPanel()}</section>`);
    }
    return html;
  };

  const previousLoadRemoteDataForMaterials = loadRemoteData;
  loadRemoteData = async function materialsLoadRemoteData() {
    await previousLoadRemoteDataForMaterials();
    await loadMaterials();
  };

  const previousClearRemoteStateForMaterials = clearRemoteState;
  clearRemoteState = function materialsClearRemoteState() {
    previousClearRemoteStateForMaterials();
    state.learningMaterials = [];
  };

  const previousBindEventsForMaterials = bindEvents;
  bindEvents = function materialsBindEvents(root) {
    previousBindEventsForMaterials(root);
    root.querySelector("#lm-upload-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = event.currentTarget.querySelector("input[name='file']");
      const file = input && input.files && input.files[0];
      await uploadMaterial(file);
    });
    root.querySelectorAll("[data-lm-download]").forEach((button) => {
      button.addEventListener("click", () => downloadMaterial(button.getAttribute("data-lm-download")));
    });
    root.querySelectorAll("[data-lm-delete]").forEach((button) => {
      button.addEventListener("click", () => deleteMaterial(button.getAttribute("data-lm-delete")));
    });
  };
})();
