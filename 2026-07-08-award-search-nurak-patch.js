(() => {
  // 1) 지급 사유에 '누락' 추가
  // 2) 관리자 지급 화면에 지급 내역 검색창 추가 ('누락' 검색 시 해당 지급만 보여 수정 편리)
  if (typeof state === "undefined") return;

  // ---- 1) 사유 '누락' 추가 ('기타' 앞에) ----
  if (typeof reasons !== "undefined" && Array.isArray(reasons) && !reasons.includes("누락")) {
    const idx = reasons.indexOf("기타");
    if (idx >= 0) reasons.splice(idx, 0, "누락");
    else reasons.push("누락");
  }

  // ---- 2) 지급 내역 검색 (관리자, 수정 중이 아닐 때) ----
  if (typeof awardView === "function") {
    const originalAwardView = awardView;
    awardView = function searchAwardView() {
      let html = originalAwardView();
      if (typeof isAdmin === "function" && isAdmin() && !state.editingTransactionId) {
        const box = `<div class="award-search-box" style="margin:6px 0 2px;"><label>지급 내역 검색<input type="search" id="award-search" placeholder="예: 누락 · 아이 이름 · 사유" autocomplete="off" /></label></div>`;
        const anchor = `<section class="feed"><h2>지급 내역 수정</h2>`;
        if (html.includes(anchor)) html = html.replace(anchor, box + anchor);
      }
      return html;
    };
  }

  // 검색 입력 → 같은 화면의 지급 내역 항목을 텍스트로 필터 (재렌더 없이, 포커스 유지)
  if (!window.__awardSearchBound) {
    window.__awardSearchBound = true;
    document.addEventListener("input", (event) => {
      const el = event.target;
      if (!el || el.id !== "award-search") return;
      const q = String(el.value || "").trim().toLowerCase();
      const scope = el.closest("section.stack") || document;
      scope.querySelectorAll(".feed .feed-item").forEach((item) => {
        const text = (item.textContent || "").toLowerCase();
        item.style.display = !q || text.includes(q) ? "" : "none";
      });
    });
  }
})();
