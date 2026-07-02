(() => {
  if (typeof state === "undefined") return;

  state.adminSection = state.adminSection || "lesson";

  const adminSections = [
    ["lesson", "말씀"],
    ["students", "아이"],
    ["roles", "권한"],
    ["links", "연결"],
    ["summary", "현황"]
  ];

  function safeText(value) {
    return typeof escapeHtml === "function"
      ? escapeHtml(value)
      : String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function showAppLoadHelp(message) {
    const root = document.getElementById("root");
    if (!root || root.children.length > 0) return;
    root.innerHTML = `<section class="login-screen"><div class="login-card"><p class="eyebrow">연결 확인</p><h1>앱을 불러오지 못했습니다</h1><p class="empty">${safeText(message)}</p><button class="primary-button" type="button" onclick="window.location.reload()">다시 시도</button></div></section>`;
  }

  function sectionKeyForPanel(panel) {
    const title = panel.querySelector("h2, h3")?.textContent?.trim() || "";
    if (title.includes("이번 주 성경")) return "lesson";
    if (title.includes("아이 등록") || title.includes("아이 관리")) return "students";
    if (title.includes("사용자 권한")) return "roles";
    if (title.includes("선생님과 아이") || title.includes("보호자와 아이")) return "links";
    if (panel.classList.contains("metric-grid")) return "summary";
    return "";
  }

  function enhanceAdminSections(root) {
    const heading = root.querySelector(".section-heading h2");
    if (!heading || heading.textContent.trim() !== "관리자 화면") return;

    const headingWrap = heading.closest(".section-heading");
    if (!headingWrap || root.querySelector("[data-admin-section-nav]")) return;

    const nav = document.createElement("div");
    nav.className = "admin-section-nav";
    nav.dataset.adminSectionNav = "true";
    nav.innerHTML = adminSections.map(([key, label]) => (
      `<button class="${state.adminSection === key ? "active" : ""}" type="button" data-admin-section="${key}">${label}</button>`
    )).join("");
    headingWrap.insertAdjacentElement("afterend", nav);

    root.querySelectorAll("#bible-lesson-form, #student-form, #teacher-link-form, #guardian-link-form, .feed, .metric-grid").forEach((panel) => {
      const key = sectionKeyForPanel(panel);
      if (!key) return;
      panel.classList.toggle("admin-section-hidden", key !== state.adminSection);
      panel.dataset.adminSectionPanel = key;
    });

    nav.querySelectorAll("[data-admin-section]").forEach((button) => {
      button.addEventListener("click", () => {
        state.adminSection = button.dataset.adminSection;
        render();
      });
    });
  }

  function confirmStoryDelete(event) {
    const postButton = event.target.closest("[data-delete-story-post]");
    const commentButton = event.target.closest("[data-delete-story-comment]");
    const button = postButton || commentButton;
    if (!button) return;

    const target = postButton ? "이야기 게시글" : "댓글";
    if (!window.confirm(`${target}을 삭제할까요? 화면에서는 숨김 처리됩니다.`)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  const previousBindEventsForUxSafety = bindEvents;
  bindEvents = function patchedUxSafetyBindEvents(root) {
    root.addEventListener("click", confirmStoryDelete, true);
    previousBindEventsForUxSafety(root);
    enhanceAdminSections(root);
  };

  updateWeeklyBibleLesson = async function patchedSafeWeeklyBibleLesson(payload) {
    if (!isAdmin()) return setMessage("관리자만 성경 구절을 업데이트할 수 있습니다.");
    const { data, error } = await state.client.rpc("save_weekly_bible_lesson", {
      p_title: payload.title,
      p_verse_ref: payload.verseRef,
      p_verse_text: payload.verseText,
      p_verse_ko: payload.verseKo
    });
    if (error) {
      const needsSql = String(error.message || "").includes("save_weekly_bible_lesson");
      return setMessage(needsSql ? "Supabase SQL 업데이트를 먼저 적용해야 합니다." : error.message);
    }
    state.bibleLesson = normalizeBibleLesson(data);
    await loadRemoteData();
    state.message = "이번 주 성경 구절을 안전하게 저장했습니다.";
    state.view = "bible";
    render();
  };

  window.addEventListener("error", () => {
    showAppLoadHelp("네트워크 또는 스크립트 로딩 문제가 있습니다. 인터넷 연결을 확인한 뒤 다시 시도해주세요.");
  });

  window.addEventListener("load", () => {
    if (!window.supabase?.createClient) {
      showAppLoadHelp("Supabase 클라이언트 파일을 불러오지 못했습니다. 잠시 후 다시 접속해주세요.");
    }
  });
})();
