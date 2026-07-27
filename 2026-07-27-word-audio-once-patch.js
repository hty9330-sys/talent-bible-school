(() => {
  if (typeof state === "undefined") return;

  function keepWordAudioSingle(root) {
    root.querySelectorAll(".bible-view .word-card").forEach((card) => {
      const word = card.querySelector("strong")?.textContent?.trim();
      const button = card.querySelector(".audio-button[data-speak]");
      if (word && button) button.dataset.speak = word;
    });
  }

  const previousBindEventsForWordAudioOnce = bindEvents;
  bindEvents = function wordAudioOnceBindEvents(root) {
    previousBindEventsForWordAudioOnce(root);
    keepWordAudioSingle(root);
  };
})();
