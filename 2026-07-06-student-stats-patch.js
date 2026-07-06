(() => {
  if (typeof state === "undefined") return;

  // 2026-07-06 학생 상세: 지급내역/메모/통계 하위 탭 + 학생별 통계 + 메모 분류 배지
  state.studentTab = state.studentTab || "transactions";
  state.studentStatsPeriod = state.studentStatsPeriod || "month";
  state.studentStats = state.studentStats || { studentId: "", loading: false, loadedAt: 0, transactions: [], notes: [] };

  const categoryMeta = {
    "성장": { icon: "🌱", color: "#4c9a2a" },
    "신앙": { icon: "📖", color: "#2f6f63" },
    "관계": { icon: "🤝", color: "#c77d2f" },
    "기도": { icon: "🙏", color: "#6a5acd" },
    "부모상담": { icon: "👨‍👩‍👧", color: "#b0568f" },
    "기타": { icon: "📌", color: "#777777" }
  };
  const categoryNames = Object.keys(categoryMeta);
  const periodLabels = [["month", "이번 달"], ["quarter", "이번 분기"], ["year", "올해"], ["all", "전체"]];

  const css = document.createElement("style");
  css.textContent = [
    ".student-tab-nav{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0;}",
    ".student-tab-nav button{padding:7px 14px;border-radius:16px;border:1px solid rgba(47,111,99,0.4);background:#fff;}",
    ".student-tab-nav button.active{background:#2f6f63;color:#fff;}",
    ".note-category-badge{display:inline-block;padding:1px 8px;border-radius:10px;color:#fff;font-size:0.75rem;margin-right:6px;}",
    ".student-scroll-feed{max-height:min(340px,48vh);overflow-y:auto;overscroll-behavior:contain;padding-right:12px;scrollbar-gutter:stable;}",
    ".student-scroll-feed::-webkit-scrollbar{width:10px;}",
    ".student-scroll-feed::-webkit-scrollbar-track{background:rgba(215,222,212,0.45);border-radius:999px;}",
    ".student-scroll-feed::-webkit-scrollbar-thumb{background:#9bb8ad;border-radius:999px;}"
  ].join("\n");
  document.head.appendChild(css);

  function seoulDateOf(value) {
    const date = value ? new Date(value) : new Date();
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(date).reduce((acc, part) => { acc[part.type] = part.value; return acc; }, {});
    return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day) };
  }

  function inStudentPeriod(createdAt) {
    if (state.studentStatsPeriod === "all") return true;
    const now = seoulDateOf();
    const t = seoulDateOf(createdAt);
    if (state.studentStatsPeriod === "year") return t.y === now.y;
    if (state.studentStatsPeriod === "quarter") {
      return t.y === now.y && Math.floor((t.m - 1) / 3) === Math.floor((now.m - 1) / 3);
    }
    return t.y === now.y && t.m === now.m;
  }

  function categoryBadge(category) {
    const meta = categoryMeta[category] || categoryMeta["기타"];
    const label = categoryMeta[category] ? category : "기타";
    return `<span class="note-category-badge" style="background:${meta.color}">${meta.icon} ${label}</span>`;
  }

  async function loadStudentStats(studentId) {
    if (state.studentStats.loading) return;
    state.studentStats.loading = true;
    state.studentStats.studentId = studentId;
    try {
      const [txResult, noteResult] = await Promise.all([
        state.client.from("talent_transactions").select("amount, reason, created_at").eq("student_id", studentId).order("created_at", { ascending: false }).range(0, 4999),
        state.client.from("student_notes").select("category, created_at, users(name)").eq("student_id", studentId).order("created_at", { ascending: false }).range(0, 4999)
      ]);
      state.studentStats.transactions = txResult.data || [];
      state.studentStats.notes = noteResult.data || [];
      state.studentStats.loadedAt = Date.now();
    } catch (error) {
      state.studentStats.transactions = [];
      state.studentStats.notes = [];
    }
    state.studentStats.loading = false;
    render();
  }

  function bars(entries, maxValue, formatValue) {
    return entries.map(([label, value, display]) => {
      const width = maxValue > 0 ? Math.max(2, Math.round((value / maxValue) * 100)) : 2;
      return `<div class="stats-bar-row"><span class="stats-bar-label">${escapeHtml(label)}</span><div class="stats-bar-track"><div class="stats-bar-fill" style="width:${width}%"></div></div><span class="stats-bar-value">${display}</span></div>`;
    }).join("");
  }

  function studentStatsHtml(student) {
    if (state.studentStats.loading || !state.studentStats.loadedAt || state.studentStats.studentId !== student.id) {
      return `<div class="form-panel compact"><p class="empty">통계를 불러오는 중입니다...</p></div>`;
    }
    const periodTx = state.studentStats.transactions.filter((tx) => inStudentPeriod(tx.created_at));
    const earned = periodTx.filter((tx) => Number(tx.amount) > 0).reduce((sum, tx) => sum + Number(tx.amount), 0);
    const used = Math.abs(periodTx.filter((tx) => Number(tx.amount) < 0).reduce((sum, tx) => sum + Number(tx.amount), 0));

    const byReason = {};
    periodTx.filter((tx) => Number(tx.amount) > 0).forEach((tx) => {
      const key = tx.reason || "기타";
      byReason[key] = byReason[key] || { count: 0, sum: 0 };
      byReason[key].count += 1;
      byReason[key].sum += Number(tx.amount);
    });
    const reasonEntries = Object.entries(byReason).sort((a, b) => b[1].sum - a[1].sum);
    const reasonMax = reasonEntries.length > 0 ? reasonEntries[0][1].sum : 0;

    const periodNotes = state.studentStats.notes.filter((n) => inStudentPeriod(n.created_at));
    const byCategory = {};
    periodNotes.forEach((n) => {
      const key = categoryNames.includes(n.category) ? n.category : "기타";
      byCategory[key] = (byCategory[key] || 0) + 1;
    });
    const categoryEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const categoryMax = categoryEntries.length > 0 ? categoryEntries[0][1] : 0;
    const lastNote = state.studentStats.notes[0];

    const activity = [
      ...periodTx.map((tx) => ({
        at: tx.created_at,
        text: Number(tx.amount) >= 0
          ? `달란트 지급 +${tx.amount} (${tx.reason || "기타"})`
          : `달란트 사용 ${tx.amount} (${tx.reason || "기타"})`
      })),
      ...periodNotes.map((n) => ({
        at: n.created_at,
        text: `메모 작성 ${categoryMeta[n.category] ? categoryMeta[n.category].icon : "📌"} ${n.category || "기타"}${n.users?.name ? " · " + n.users.name : ""}`
      }))
    ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 30);

    return `<div class="form-panel compact">
<div class="stats-period-nav">${periodLabels.map(([key, label]) => `<button type="button" class="${state.studentStatsPeriod === key ? "active" : ""}" data-student-period="${key}">${label}</button>`).join("")}</div>
<div class="metric-grid">
<div class="metric"><span>현재 보유</span><strong>${Number(student.total_talents || 0)}</strong></div>
<div class="metric"><span>기간 획득</span><strong>${earned}</strong></div>
<div class="metric"><span>기간 사용</span><strong>${used}</strong></div>
<div class="metric"><span>순 증가</span><strong>${earned - used}</strong></div>
</div>
<h3>지급 사유별</h3>
${reasonEntries.length === 0 ? `<p class="empty">선택한 기간에 지급 내역이 없습니다.</p>` : bars(reasonEntries.map(([label, v]) => [label, v.sum, `${v.sum} (${v.count}회)`]), reasonMax)}
<h3>메모 통계</h3>
<p class="empty">기간 메모 ${periodNotes.length}건 · 최근 작성 ${lastNote ? formatDate(lastNote.created_at) : "없음"}</p>
${categoryEntries.length === 0 ? `<p class="empty">선택한 기간에 작성된 메모가 없습니다.</p>` : bars(categoryEntries.map(([label, v]) => [label, v, `${v}건`]), categoryMax)}
<h3>최근 활동</h3>
${activity.length === 0 ? `<p class="empty">선택한 기간에 활동이 없습니다.</p>` : `<div class="${activity.length > 3 ? "student-scroll-feed" : ""}">${activity.map((a) => `<div class="feed-item"><small>${formatDate(a.at)}</small><p>${escapeHtml(a.text)}</p></div>`).join("")}</div>`}
</div>`;
  }

  // 메모 목록에 분류 배지 표시
  noteFeed = function patchedNoteFeed(title, items) {
    return `<section class="feed"><h2>${title}</h2>${items.length === 0 ? `<p class="empty">메모가 없습니다.</p>` : ""}${items.map((item) => `<button class="feed-item note" type="button" data-student="${item.student_id}"><span>${categoryBadge(item.category)}<b>${escapeHtml(item.student_name)}</b></span><small>${formatDate(item.created_at)} · ${escapeHtml(item.teacher_name)}</small><p>${escapeHtml(item.note)}</p></button>`).join("")}</section>`;
  };

  // 학생 상세 화면: 하위 탭 구성
  studentView = function patchedStudentView() {
    const student = getStudent(state.selectedStudentId);
    if (!student) return emptyStudentsView();
    const staff = isStaff();
    const tabs = staff
      ? [["transactions", "지급내역"], ["notes", "선생님 메모"], ["stats", "학생 통계"]]
      : [["transactions", "지급내역"]];
    if (!tabs.some(([key]) => key === state.studentTab)) state.studentTab = "transactions";

    let body = "";
    if (state.studentTab === "notes" && staff) {
      const noteItems = state.notes.filter((item) => item.student_id === student.id);
      body = noteFeed("선생님 메모 기록", noteItems);
      if (noteItems.length > 3) body = body.replace('<section class="feed">', '<section class="feed student-scroll-feed">');
    } else if (state.studentTab === "stats" && staff) {
      body = studentStatsHtml(student);
    } else {
      const txItems = state.transactions.filter((item) => item.student_id === student.id);
      body = transactionFeed("전체 달란트 지급 기록", txItems);
      if (txItems.length > 3) body = body.replace('<section class="feed">', '<section class="feed student-scroll-feed">');
    }

    return `<section class="stack"><div class="profile-panel"><p>${escapeHtml(student.grade)} · ${escapeHtml(student.group_name)}</p><h2>${escapeHtml(student.name)}</h2><strong>${student.total_talents} 달란트</strong></div>${staff ? `<div class="action-row"><button class="primary-button" type="button" data-view="award">달란트 지급</button><button class="secondary-button" type="button" data-view="bible">성경 학습</button></div>` : ""}${tabs.length > 1 ? `<div class="student-tab-nav">${tabs.map(([key, label]) => `<button type="button" class="${state.studentTab === key ? "active" : ""}" data-student-tab="${key}">${label}</button>`).join("")}</div>` : ""}${body}</section>`;
  };

  const previousBindEventsForStudentStats = bindEvents;
  bindEvents = function studentStatsPatchedBindEvents(root) {
    previousBindEventsForStudentStats(root);
    root.querySelectorAll("[data-student-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        state.studentTab = button.dataset.studentTab;
        if (state.studentTab === "stats") {
          const student = getStudent(state.selectedStudentId);
          if (student && (state.studentStats.studentId !== student.id || !state.studentStats.loadedAt)) {
            state.studentStats.loadedAt = 0;
            render();
            loadStudentStats(student.id);
            return;
          }
        }
        render();
      });
    });
    root.querySelectorAll("[data-student-period]").forEach((button) => {
      button.addEventListener("click", () => {
        state.studentStatsPeriod = button.dataset.studentPeriod;
        render();
      });
    });
  };
})();
