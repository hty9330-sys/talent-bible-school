(() => {
  if (typeof state === "undefined") return;

  // 2026-07-08 홈 화면: 전체 아이들 달란트 획득 막대그래프 (선생님·관리자 전용)
  state.homeTalentChart = state.homeTalentChart || { loading: false, loadedAt: 0, earnedByStudent: {} };

  const CACHE_MS = 60 * 1000; // 1분마다 새로 불러오기

  const chartCss = document.createElement("style");
  chartCss.textContent = [
    ".home-chart-row{display:flex;align-items:center;gap:8px;margin:7px 0;}",
    ".home-chart-label{flex:0 0 72px;font-size:0.9rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
    ".home-chart-track{flex:1;background:rgba(47,111,99,0.12);border-radius:8px;height:22px;overflow:hidden;}",
    ".home-chart-fill{background:linear-gradient(90deg,#2f6f63,#4a9c8c);height:100%;border-radius:8px;min-width:3px;transition:width 0.4s ease;}",
    ".home-chart-fill.top{background:linear-gradient(90deg,#c98a2d,#e2ab52);}",
    ".home-chart-value{flex:0 0 auto;font-size:0.85rem;font-weight:600;white-space:nowrap;color:#2f6f63;}"
  ].join("\n");
  document.head.appendChild(chartCss);

  async function loadHomeTalentChart() {
    if (state.homeTalentChart.loading || !state.client || !state.session) return;
    state.homeTalentChart.loading = true;
    try {
      const { data, error } = await state.client
        .from("talent_transactions")
        .select("student_id, amount")
        .range(0, 4999);
      if (!error) {
        const earned = {};
        (data || []).forEach((tx) => {
          const amount = Number(tx.amount);
          if (amount > 0) earned[tx.student_id] = (earned[tx.student_id] || 0) + amount;
        });
        state.homeTalentChart.earnedByStudent = earned;
        state.homeTalentChart.loadedAt = Date.now();
      }
    } catch (e) {
      // 네트워크 오류 시 다음 렌더에서 재시도
    }
    state.homeTalentChart.loading = false;
    render();
  }

  function homeTalentChartHtml() {
    const students = state.students || [];
    if (students.length === 0) return "";

    if (!state.homeTalentChart.loadedAt) {
      return `<div class="form-panel compact" data-home-talent-chart><div class="section-heading"><h2>아이들 달란트 획득 현황</h2><span>${students.length}명</span></div><p class="empty">획득 현황을 불러오는 중입니다...</p></div>`;
    }

    const earned = state.homeTalentChart.earnedByStudent;
    const rows = students
      .map((s) => ({ name: s.name, value: Number(earned[s.id] || 0) }))
      .sort((a, b) => b.value - a.value);
    const max = rows.reduce((m, r) => Math.max(m, r.value), 0);
    const total = rows.reduce((sum, r) => sum + r.value, 0);

    const bars = rows.map((r, i) => {
      const width = max > 0 ? Math.max(3, Math.round((r.value / max) * 100)) : 3;
      const topClass = i === 0 && r.value > 0 ? " top" : "";
      return `<div class="home-chart-row"><span class="home-chart-label">${escapeHtml(r.name)}</span><div class="home-chart-track"><div class="home-chart-fill${topClass}" style="width:${width}%"></div></div><span class="home-chart-value">${r.value}개</span></div>`;
    }).join("");

    return `<div class="form-panel compact" data-home-talent-chart><div class="section-heading"><h2>아이들 달란트 획득 현황</h2><span>전체 ${total}개 · ${students.length}명</span></div>${bars}<p class="empty">지급된 달란트 누적 획득 개수입니다. (차감·사용 제외)</p></div>`;
  }

  const previousHomeViewForChart = homeView;
  homeView = function talentChartHomeView() {
    const html = previousHomeViewForChart();
    if (typeof html !== "string" || !isStaff()) return html;

    const stale = Date.now() - state.homeTalentChart.loadedAt > CACHE_MS;
    if (stale && !state.homeTalentChart.loading) loadHomeTalentChart();

    const chart = homeTalentChartHtml();
    if (!chart) return html;

    const anchor = '<div class="quick-grid">';
    if (html.includes(anchor)) return html.replace(anchor, chart + anchor);
    return html.replace("</section>", chart + "</section>");
  };
})();
