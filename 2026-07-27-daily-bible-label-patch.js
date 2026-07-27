(() => {
  if (typeof state === "undefined") return;

  function renamePsalmLabel(root) {
    root.querySelectorAll(".db-row .db-ref b").forEach((label) => {
      label.textContent = label.textContent.replace("🌿 시편", "🌿 성경");
    });
  }

  const previousBindEventsForDailyBibleLabel = bindEvents;
  bindEvents = function dailyBibleLabelBindEvents(root) {
    previousBindEventsForDailyBibleLabel(root);
    if (state.view === "dailybible") renamePsalmLabel(root);
  };
})();
