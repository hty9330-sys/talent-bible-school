(() => {
  if (typeof state === "undefined") return;

  // 2026-07-06 관리자 전용 전체 통계 + 메모 분류
  state.adminStats = state.adminStats || { loading: false, loadedAt: 0, transactions: [], notes: [] };
  state.statsPeriod = state.statsPeriod || "month";

  const noteCategories = ["성장", "신앙", "관계", "기도", "부모상담", "기타"];
  const periodLabels = [["month", "이번 달"], ["quarter", "이번 분기"], ["year", "올해"], ["all", "전체"]];

  const statsCss = document.createElement("style");
  statsCss.textContent = [
    ".stats-bar-row{display:flex;align-items:center;gap:8px;margin:6px 0;}",
    ".stats-bar-label{flex:0 0 88px;font-size:0.85rem;}",
    ".stats-bar-track{flex:1;background:rgba(47,111,99,0.12);border-radius:6px;height:18px;overflow:hidden;}",
    ".stats-bar-fill{background:#2f6f63;height:100%;border-radius:6px;min-width:2px;}",
    ".stats-bar-value{flex:0 0 auto;font-size:0.8rem;white-space:nowrap;}",
    ".stats-table{width:100%;border-collapse:collapse;font-size:0.85rem;}",
    ".stats-table th,.stats-table td{padding:6px 4px;border-bottom:1px solid rgba(0,0,0,0.08);text-align:right;}",
    ".stats-table th:first-child,.stats-table td:first-child{text-align:left;}",
    ".stats-period-nav{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0;}",
    ".stats-period-nav button{padding:6px 12px;border-radius:16px;border:1px solid rgba(47,111,99,0.4);background:#fff;}",
    ".stats-period-nav button.active{background:#2f6f63;color:#fff;}"
  ].join("\n");
  document.head.appendChild(statsCss);

  function seoulDateOf(value) {
    const date = value ? new Date(value) : new Date();
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(date).reduce((acc, part) => { acc[part.type] = part.value; return acc; }, {});
    return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day) };
  }

  function inPeriod(createdAt) {
    if (state.statsPeriod === "all") return true;
    const now = seoulDateOf();
    const t = seoulDateOf(createdAt);
    if (state.statsPeriod === "year") return t.y === now.y;
    if (state.statsPeriod === "quarter") {
      return t.y === now.y && Math.floor((t.m - 1) / 3) === Math.floor((now.m - 1) / 3);
    }
    return t.y === now.y && t.m === now.m; // month
  }

  async function loadAdminStats() {
    if (state.adminStats.loading) return;
    state.adminStats.loading = true;
    try {
      const [txResult, noteResult] = await Promise.all([
        state.client.from("talent_transactions").select("student_id, amount, reason, created_at").order("created_at", { ascending: false }).range(0, 4999),
        state.client.from("student_notes").select("student_id, category, created_at").order("created_at", { ascending: false }).range(0, 4999)
      ]);
      state.adminStats.transactions = txResult.data || [];
      state.adminStats.notes = noteResult.data || [];
      state.adminStats.loadedAt = Date.now();
    } catch (error) {
      state.adminStats.transactions = [];
      state.adminStats.notes = [];
    }
    state.adminStats.loading = false;
    render();
  }

  function pct(part, total) {
    return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
  }

  function barRows(entries, maxValue, unit) {
    return entries.map(([label, value, extra]) => {
      const width = maxValue > 0 ? Math.max(2, Math.round((value / maxValue) * 100)) : 2;
      return `<div class="stats-bar-row"><span class="stats-bar-label">${escapeHtml(label)}</span><div class="stats-bar-track"><div class="stats-bar-fill" style="width:${width}%"></div></div><span class="stats-bar-value">${value}${unit}${extra || ""}</span></div>`;
    }).join("");
  }

  function statsPanelHtml() {
    if (state.adminStats.loading || !state.adminStats.loadedAt) {
      return `<div class="form-panel compact" data-admin-section-panel="stats"><h3>전체 통계</h3><p class="empty">통계 데이터를 불러오는 중입니다...</p></div>`;
    }
    const students = state.students || [];
    const periodTx = state.adminStats.transactions.filter((tx) => inPeriod(tx.created_at));
    const awarded = periodTx.filter((tx) => Number(tx.amount) > 0);
    const spent = periodTx.filter((tx) => Number(tx.amount) < 0);
    const awardedSum = awarded.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const spentSum = Math.abs(spent.reduce((sum, tx) => sum + Number(tx.amount), 0));
    const holdingSum = students.reduce((sum, s) => sum + Number(s.total_talents || 0), 0);
    const holdingAvg = students.length > 0 ? Math.round((holdingSum / students.length) * 10) / 10 : 0;

    // 지급 사유별 (실제 데이터 기준 자동 집계)
    const byReason = {};
    awarded.forEach((tx) => {
      const key = tx.reason || "기타";
      byReason[key] = byReason[key] || { count: 0, sum: 0 };
      byReason[key].count += 1;
      byReason[key].sum += Number(tx.amount);
    });
    const reasonEntries = Object.entries(byReason).sort((a, b) => b[1].sum - a[1].sum);
    const reasonMax = reasonEntries.length > 0 ? reasonEntries[0][1].sum : 0;

    // 메모 분류별
    const periodNotes = state.adminStats.notes.filter((n) => inPeriod(n.created_at));
    const byCategory = {};
    noteCategories.forEach((c) => { byCategory[c] = 0; });
    periodNotes.forEach((n) => {
      const key = noteCategories.includes(n.category) ? n.category : "기타";
      byCategory[key] += 1;
    });
    const categoryEntries = Object.entries(byCategory).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const categoryMax = categoryEntries.length > 0 ? categoryEntries[0][1] : 0;

    // 학생 비교표
    const perStudent = students.map((s) => {
      const sTx = periodTx.filter((tx) => tx.student_id === s.id);
      const earned = sTx.filter((tx) => Number(tx.amount) > 0).reduce((sum, tx) => sum + Number(tx.amount), 0);
      const used = Math.abs(sTx.filter((tx) => Number(tx.amount) < 0).reduce((sum, tx) => sum + Number(tx.amount), 0));
      const noteCount = periodNotes.filter((n) => n.student_id === s.id).length;
      return { name: s.name, holding: Number(s.total_talents || 0), earned, used, noteCount };
    }).sort((a, b) => b.earned - a.earned);

    return `<div class="form-panel compact" data-admin-section-panel="stats"><h3>전체 통계</h3>
<div class="stats-period-nav">${periodLabels.map(([key, label]) => `<button type="button" class="${state.statsPeriod === key ? "active" : ""}" data-stats-period="${key}">${label}</button>`).join("")}</div>
<div class="metric-grid">
<div class="metric"><span>전체 학생 수</span><strong>${students.length}명</strong></div>
<div class="metric"><span>총 지급 달란트</span><strong>${awardedSum}</strong></div>
<div class="metric"><span>총 사용 달란트</span><strong>${spentSum}</strong></div>
<div class="metric"><span>전체 보유 달란트</span><strong>${holdingSum}</strong></div>
<div class="metric"><span>학생 평균 보유</span><strong>${holdingAvg}</strong></div>
</div>
<h3>지급 사유별 통계</h3>
${reasonEntries.length === 0 ? `<p class="empty">선택한 기간에 지급 내역이 없습니다.</p>` : barRows(reasonEntries.map(([label, v]) => [label, v.sum, ` (${v.count}회 · ${pct(v.sum, awardedSum)}%)`]), reasonMax, "")}
<h3>메모 분류별 통계</h3>
<p class="empty">전체 메모 ${periodNotes.length}건</p>
${categoryEntries.length === 0 ? `<p class="empty">선택한 기간에 작성된 메모가 없습니다.</p>` : barRows(categoryEntries.map(([label, v]) => [label, v, `건 (${pct(v, periodNotes.length)}%)`]), categoryMax, "")}
<h3>학생 비교표</h3>
<p class="empty">평가 목적이 아니라 전체 운영 현황 확인용입니다.</p>
<table class="stats-table"><thead><tr><th>이름</th><th>보유</th><th>기간 획득</th><th>기간 사용</th><th>메모</th></tr></thead>
<tbody>${perStudent.map((s) => `<tr><td>${escapeHtml(s.name)}</td><td>${s.holding}</td><td>${s.earned}</td><td>${s.used}</td><td>${s.noteCount}</td></tr>`).join("")}</tbody></table>
</div>`;
  }

  // 메모 작성 폼에 분류 선택 추가
  const previousNoteView = noteView;
  noteView = function statsPatchedNoteView() {
    const html = previousNoteView();
    if (typeof html !== "string" || !html.includes('id="note-form"')) return html;
    const select = `<label>메모 분류<select name="noteCategory">${noteCategories.map((c) => `<option value="${c}">${c}</option>`).join("")}</select></label><label>관찰 메모`;
    return html.replace("<label>관찰 메모", select);
  };

  // addNote가 분류를 함께 저장하도록 교체
  const previousAddNote = addNote;
  addNote = async function statsPatchedAddNote(payload) {
    if (!isStaff()) return setMessage("선생님 권한이 필요합니다.");
    const student = getStudent(payload.studentId);
    if (!student) return setMessage("아이를 먼저 등록하세요.");
    const categoryEl = document.querySelector('#note-form select[name="noteCategory"]');
    const category = categoryEl && noteCategories.includes(categoryEl.value) ? categoryEl.value : "기타";
    const { error } = await state.client.from("student_notes").insert({
      student_id: student.id,
      teacher_id: state.session.user.id,
      note: payload.note,
      category
    });
    if (error) return setMessage(error.message);
    await loadRemoteData();
    state.selectedStudentId = student.id;
    state.message = "메모를 저장했습니다.";
    state.view = "student";
    render();
  };

  // 관리자 화면 하위 탭에 '통계' 추가
  const previousBindEventsForStats = bindEvents;
  bindEvents = function statsPatchedBindEvents(root) {
    previousBindEventsForStats(root);
    if (!isAdmin()) return;

    const nav = root.querySelector("[data-admin-section-nav]");
    if (!nav || nav.querySelector('[data-admin-section="stats"]')) return;

    const statsButton = document.createElement("button");
    statsButton.type = "button";
    statsButton.dataset.adminSection = "stats";
    statsButton.textContent = "통계";
    statsButton.className = state.adminSection === "stats" ? "active" : "";
    statsButton.addEventListener("click", () => {
      state.adminSection = "stats";
      state.adminStats.loadedAt = 0;
      render();
      loadAdminStats();
    });
    nav.appendChild(statsButton);

    if (state.adminSection === "stats") {
      const wrap = document.createElement("div");
      wrap.innerHTML = statsPanelHtml();
      const panel = wrap.firstElementChild;
      nav.insertAdjacentElement("afterend", panel);
      panel.querySelectorAll("[data-stats-period]").forEach((button) => {
        button.addEventListener("click", () => {
          state.statsPeriod = button.dataset.statsPeriod;
          render();
        });
      });
      if (!state.adminStats.loadedAt && !state.adminStats.loading) loadAdminStats();
    }
  };
})();
