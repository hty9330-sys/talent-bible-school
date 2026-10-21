(() => {
  if (typeof state === "undefined") return;

  // 2026-07-08 홈 화면: 전체 아이들 달란트 보유 현황 (선생님·관리자 전용)
  // v2: 누적 획득 → 현재 보유(차감·사용 반영, students.total_talents 기준)로 변경
  // v3(2026-10-21): 그래프 제거, 이름(가나다) 순 숫자 목록으로 변경

  const chartCss = document.createElement("style");
  chartCss.textContent = [
    ".home-talent-list-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0;padding:7px 2px;border-bottom:1px solid rgba(0,0,0,0.07);}",
    ".home-talent-list-row:last-of-type{border-bottom:none;}",
    ".home-talent-list-row span{font-size:0.92rem;font-weight:600;}",
    ".home-talent-list-row b{flex:0 0 auto;font-size:0.9rem;font-weight:600;white-space:nowrap;color:#2f6f63;}"
  ].join("\n");
  document.head.appendChild(chartCss);

  function homeTalentListHtml() {
    const students = state.students || [];
    if (students.length === 0) return "";

    const rows = students
      .map((s) => ({ name: s.name, value: Number(s.total_talents || 0) }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
    const total = rows.reduce((sum, r) => sum + r.value, 0);

    const items = rows
      .map((r) => `<div class="home-talent-list-row"><span>${escapeHtml(r.name)}</span><b>${r.value} 달란트</b></div>`)
      .join("");

    return `<div class="form-panel compact" data-home-talent-chart><div class="section-heading"><h2>아이들 달란트 보유 현황</h2><span>전체 ${total}개 · ${students.length}명</span></div>${items}<p class="empty">현재 보유 개수입니다. (차감·사용 반영, 이름 가나다순)</p></div>`;
  }

  const previousHomeViewForChart = homeView;
  homeView = function talentListHomeView() {
    const html = previousHomeViewForChart();
    if (typeof html !== "string" || !isStaff()) return html;

    const list = homeTalentListHtml();
    if (!list) return html;

    const anchor = '<div class="quick-grid">';
    if (html.includes(anchor)) return html.replace(anchor, list + anchor);
    return html.replace("</section>", list + "</section>");
  };
})();
