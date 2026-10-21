(() => {
  if (typeof state === "undefined") return;

  // 2026-07-08 홈 화면: 전체 아이들 달란트 보유 현황 (선생님·관리자 전용)
  // v2: 누적 획득 → 현재 보유(차감·사용 반영, students.total_talents 기준)로 변경
  // v3(2026-10-21): 그래프 제거, 이름(가나다) 순 숫자 목록으로 변경
  // v4(2026-10-21): 이전 분기 잔액 / 이번 분기 적립을 나눠서 표시
  //   (quarter_carryover는 2026-10-21-quarter-settlement-patch.js의 분기 마감에서 저장됨)

  const chartCss = document.createElement("style");
  chartCss.textContent = [
    ".home-talent-list-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0;padding:7px 2px;border-bottom:1px solid rgba(0,0,0,0.07);}",
    ".home-talent-list-row:last-of-type{border-bottom:none;}",
    ".home-talent-list-row span{font-size:0.92rem;font-weight:600;}",
    ".home-talent-list-row b{flex:0 0 auto;font-size:0.85rem;font-weight:600;white-space:nowrap;color:#2f6f63;text-align:right;}",
    ".home-talent-list-row small{display:block;font-weight:400;color:#6a7a76;font-size:0.75rem;}"
  ].join("\n");
  document.head.appendChild(chartCss);

  function homeTalentListHtml() {
    const students = state.students || [];
    if (students.length === 0) return "";

    const rows = students
      .map((s) => {
        const total = Number(s.total_talents || 0);
        const carryover = Number(s.quarter_carryover || 0);
        const earned = total - carryover;
        return { name: s.name, total, carryover, earned };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
    const totalSum = rows.reduce((sum, r) => sum + r.total, 0);

    const items = rows
      .map((r) => `<div class="home-talent-list-row"><span>${escapeHtml(r.name)}</span><b>이전 ${r.carryover} · 이번 ${r.earned}<small>총 ${r.total} 달란트</small></b></div>`)
      .join("");

    return `<div class="form-panel compact" data-home-talent-chart><div class="section-heading"><h2>아이들 달란트 보유 현황</h2><span>전체 ${totalSum}개 · ${students.length}명</span></div>${items}<p class="empty">이전 분기 잔액 · 이번 분기 적립 · 총 보유 순서입니다. (차감·사용 반영, 이름 가나다순)</p></div>`;
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
