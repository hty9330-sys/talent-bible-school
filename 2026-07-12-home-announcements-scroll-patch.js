(() => {
  if (typeof state === "undefined" || typeof homeView !== "function") return;

  // 2026-07-12 교회소식을 홈 화면 상단에 스크롤 박스로 표시
  //  - 목적: 방문객(visitor 권한)도 교회소식을 볼 수 있게 함.
  //    (기존에는 이야기 탭 안에만 있어 방문객은 접근 불가, 홈에서는 stories-patch가 제거함)
  //  - 홈 renders 결과가 나온 뒤 최상단에 다시 추가하므로 stories-patch의 제거 로직과 충돌하지 않음.
  //  - 내용이 길 수 있어 최대 높이 + 세로 스크롤 처리, 줄바꿈/띄어쓰기 유지(pre-wrap).

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
    const panel = homeAnnouncementsPanel();
    return html.includes('<section class="stack">')
      ? html.replace('<section class="stack">', `<section class="stack">${panel}`)
      : panel + html;
  };
})();
