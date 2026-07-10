(() => {
  // 1) 지급 사유에 '누락' 추가
  // 2) 관리자 지급 화면: '지급 내역 수정' 목록 위에 검색창 + 전체 내역 대상 검색
  //    (스크롤 패치가 기본은 '이번 주'만 보여주지만, 검색이 과거 기록까지 닿도록 전체로 교체)
  if (typeof state === "undefined") return;

  // ---- 1) 사유 '누락' 추가 ('기타' 앞) ----
  if (typeof reasons !== "undefined" && Array.isArray(reasons) && !reasons.includes("누락")) {
    const idx = reasons.indexOf("기타");
    if (idx >= 0) reasons.splice(idx, 0, "누락");
    else reasons.push("누락");
  }

  // ---- 2) 지급 내역 검색 (관리자, 수정 중이 아닐 때) ----
  if (typeof awardView === "function") {
    const originalAwardView = awardView;
    const feedRegex = /<section class="feed[^"]*"><h2>지급 내역 수정<\/h2>[\s\S]*?<\/section>/;

    awardView = function searchAwardView() {
      let html = originalAwardView();
      if (!(typeof isAdmin === "function" && isAdmin()) || state.editingTransactionId) return html;
      if (!Array.isArray(state.transactions) || typeof transactionFeed !== "function") return html;
      if (!feedRegex.test(html)) return html;

      // 전체 내역으로 교체 (기본 '이번 주' 제한 해제) + 5건 이상이면 스크롤 유지
      let fresh = transactionFeed("지급 내역 수정", state.transactions);
      if (state.transactions.length >= 5) {
        fresh = fresh.replace('<section class="feed">', '<section class="feed award-edit-scroll-feed">');
      }

      // 검색창을 목록 '바로 위'(스크롤 영역 밖)에 고정 배치
      const searchInput =
        `<div class="award-search-box" style="margin:8px 0 4px;">` +
        `<input type="search" id="award-search" placeholder="누락 · 아이 이름 · 사유 검색" autocomplete="off" ` +
        `style="width:100%;padding:9px 12px;border:1px solid #d9d4c7;border-radius:10px;font-size:15px;box-sizing:border-box;" /></div>`;

      return html.replace(feedRegex, searchInput + fresh);
    };
  }

  // 검색 입력 → 지급 내역 항목을 텍스트로 필터 (재렌더 없이, 포커스 유지)
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
