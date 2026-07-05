(() => {
  if (typeof awardView === "undefined") return;

  const previousAwardViewForScroll = awardView;

  function sundayWeekKeyFromDate(value) {
    const date = value ? new Date(value) : new Date();
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date).reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
    const seoulDate = new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
    seoulDate.setDate(seoulDate.getDate() - seoulDate.getDay());
    const year = seoulDate.getFullYear();
    const month = String(seoulDate.getMonth() + 1).padStart(2, "0");
    const day = String(seoulDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  awardView = function patchedAwardViewWithScroll() {
    if (!Array.isArray(state?.transactions)) return previousAwardViewForScroll();

    const currentWeek = sundayWeekKeyFromDate();
    const allTransactions = state.transactions;
    const weeklyTransactions = allTransactions.filter((item) => sundayWeekKeyFromDate(item.created_at) === currentWeek);

    try {
      state.transactions = weeklyTransactions;
      const html = previousAwardViewForScroll();
      if (weeklyTransactions.length < 5) return html;
      return html.replace(
        /<section class="feed">(<h2>[^<]*<\/h2>)/,
        '<section class="feed award-edit-scroll-feed">$1'
      );
    } finally {
      state.transactions = allTransactions;
    }
  };
})();
