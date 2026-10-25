(() => {
  if (typeof state === "undefined") return;

  // 2026-10-25 홈 '아이들 달란트 보유 현황'을 표(board) 형태로 변경
  //  - 가로: 아이 이름(가나다순)
  //  - 세로: 이전(이전 분기 잔액) / 이번(이번 분기 적립) / 총(총 보유)
  //  - 기존 세로 목록(2026-07-08-home-talent-chart-patch.js의 data-home-talent-chart)을 이 표로 교체한다.
  //  - 원본 파일은 그대로 두고, homeView 렌더 결과에서 해당 블록만 치환하는 방식이라 되돌리기 쉽다.
  //  - 이 스크립트는 index.html에서 2026-07-08-home-talent-chart-patch.js 뒤에 로드되어야 한다.

  const boardCss = document.createElement("style");
  boardCss.textContent = [
    "[data-home-talent-board] .talent-board-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:6px;}",
    "table.talent-board{border-collapse:collapse;font-size:0.85rem;width:auto;min-width:100%;}",
    "table.talent-board th,table.talent-board td{border:1px solid rgba(0,0,0,0.1);padding:6px 10px;text-align:center;white-space:nowrap;}",
    "table.talent-board thead th{background:#eaf3f0;color:#2f6f63;font-weight:700;}",
    "table.talent-board tbody th{background:#f5f7f6;color:#2f6f63;font-weight:700;position:sticky;left:0;z-index:1;}",
    "table.talent-board thead th:first-child{position:sticky;left:0;z-index:2;background:#eaf3f0;}",
    "table.talent-board td{font-weight:600;color:#1f2a28;}",
    "table.talent-board tr.board-total th,table.talent-board tr.board-total td{border-top:2px solid #2f6f63;font-weight:700;}"
  ].join("\n");
  document.head.appendChild(boardCss);

  function homeTalentBoardHtml() {
    const students = state.students || [];
    if (students.length === 0) return "";

    const rows = students
      .map((s) => {
        const total = Number(s.total_talents || 0);
        const carryover = Number(s.quarter_carryover || 0);
        return { name: s.name, total, carryover, earned: total - carryover };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
    const totalSum = rows.reduce((sum, r) => sum + r.total, 0);

    const nameHead = rows.map((r) => `<th>${escapeHtml(r.name)}</th>`).join("");
    const prevRow = rows.map((r) => `<td>${r.carryover}</td>`).join("");
    const thisRow = rows.map((r) => `<td>${r.earned}</td>`).join("");
    const totalRow = rows.map((r) => `<td>${r.total}</td>`).join("");

    return `<div class="form-panel compact" data-home-talent-board><div class="section-heading"><h2>아이들 달란트 보유 현황</h2><span>전체 ${totalSum}개 · ${students.length}명</span></div><div class="talent-board-scroll"><table class="talent-board"><thead><tr><th>구분</th>${nameHead}</tr></thead><tbody><tr><th>이전</th>${prevRow}</tr><tr><th>이번</th>${thisRow}</tr><tr class="board-total"><th>총</th>${totalRow}</tr></tbody></table></div><p class="empty">가로: 이름(가나다순) · 세로: 이전 분기 잔액 / 이번 분기 적립 / 총 보유 (차감·사용 반영)</p></div>`;
  }

  if (typeof homeView !== "function") return;
  const previousHomeViewForBoard = homeView;
  homeView = function talentBoardHomeView() {
    const html = previousHomeViewForBoard();
    if (typeof html !== "string" || !isStaff()) return html;

    const board = homeTalentBoardHtml();
    if (!board) return html;

    // 기존 세로 목록 블록을 찾아 표로 교체 (원본 파일은 수정하지 않고 렌더 결과만 치환)
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    const old = tpl.content.querySelector("[data-home-talent-chart]");
    if (old) {
      const holder = document.createElement("template");
      holder.innerHTML = board;
      old.replaceWith(holder.content);
      return tpl.innerHTML;
    }

    // 기존 블록을 못 찾으면(이전 패치 미적용 등) 기존 주입 위치에 추가
    const anchor = '<div class="quick-grid">';
    if (html.includes(anchor)) return html.replace(anchor, board + anchor);
    return html.replace("</section>", board + "</section>");
  };
})();
