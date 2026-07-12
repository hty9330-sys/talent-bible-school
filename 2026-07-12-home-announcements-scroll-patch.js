(() => {
  if (typeof state === "undefined" || typeof homeView !== "function") return;

  // 2026-07-12 교회소식을 홈 화면 상단에 스크롤 박스로 표시 (승인된 사용자 전용)
  //  - 보이는 대상: guardian / teacher / admin. 방문객(visitor)에게는 표시하지 않음.
  //  - 이야기 탭의 교회소식 게시판은 제거되었고, 교회소식은 홈에서만 노출됨.
  //  - 내용이 길 수 있어 최대 높이 + 세로 스크롤, 줄바꿈/띄어쓰기 유지(pre-wrap).

  function announcementsAllowed() {
    const role = state.profile?.role || "visitor";
    return ["admin", "teacher", "guardian"].includes(role);
  }

  function homeAnnouncementsPanel() {
    const items = (state.announcements || [])
      .filter((it) => it.is_active !== false)
      .slice(0, 30);
    const body = items.length === 0
      ? `<p class="empty">등록된 교회소식이 없습니다.</p>`
      : items.map((it) => `<div class="feed-item announcement-item"><span><b>${escapeHtml(it.title)}</b></span><small>${formatDate(it.created_at)}</small><p style="white-space:pre-wrap;">${escapeHtml(it.body)}</p></div>`).join("");
    return `<section class="feed announcement-feed home-announcements"><h2>교회소식</h2><div class="home-announcements-scroll" style="max-height:360px;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-right:4px;">${body}</div></section>`;
  }

  const previousHomeViewForScroll = homeView;
  homeView = function homeAnnouncementsScrollHomeView() {
    const html = previousHomeViewForScroll();
    if (typeof html !== "string") return html;
    if (!announcementsAllowed()) return html; // 방문객에게는 교회소식을 노출하지 않음
    const panel = homeAnnouncementsPanel();
    return html.includes('<section class="stack">')
      ? html.replace('<section class="stack">', `<section class="stack">${panel}`)
      : panel + html;
  };
})();
