(() => {
  if (typeof awardView === "undefined") return;

  const previousAwardViewForScroll = awardView;

  awardView = function patchedAwardViewWithScroll() {
    const html = previousAwardViewForScroll();
    if (!Array.isArray(state?.transactions) || state.transactions.length < 5) return html;
    return html.replace(
      '<section class="feed"><h2>지급 내역 수정</h2>',
      '<section class="feed award-edit-scroll-feed"><h2>지급 내역 수정</h2>'
    );
  };
})();
