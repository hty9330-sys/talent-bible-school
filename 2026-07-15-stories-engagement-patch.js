(() => {
  if (typeof state === "undefined") return;

  const SEEN_KEY = "talent_story_seen_latest_at";
  const PUSH_FUNCTION_URL = "https://eesdzgehomzccrrykrqb.supabase.co/functions/v1/send-push";

  state.storySeenLatestAt = state.storySeenLatestAt || localStorage.getItem(SEEN_KEY) || "";

  const css = document.createElement("style");
  css.textContent = [
    ".story-preview-card{border-left:4px solid #2f6f63;}",
    ".story-preview-list{display:grid;gap:8px;margin-top:8px;}",
    ".story-preview-item{display:block;width:100%;text-align:left;background:#fff;border:1px solid rgba(47,111,99,0.18);border-radius:8px;padding:10px;color:inherit;}",
    ".story-preview-item b{display:block;margin-bottom:3px;}",
    ".story-preview-item p{margin:4px 0;color:#4f5d57;line-height:1.45;}",
    ".story-preview-item small{color:#66736d;}",
    ".story-new-badge{display:inline-flex;align-items:center;justify-content:center;margin-left:4px;padding:1px 5px;border-radius:999px;background:#c84630;color:#fff;font-size:0.62rem;font-weight:700;line-height:1.2;}",
    ".story-nav-dot{display:inline-block;width:7px;height:7px;margin-left:4px;border-radius:999px;background:#c84630;vertical-align:top;}"
  ].join("\n");
  document.head.appendChild(css);

  function activeStoryPosts() {
    return (state.storyPosts || [])
      .filter((item) => item.is_active !== false)
      .slice()
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  function latestStoryAt() {
    const latest = activeStoryPosts()[0];
    return latest?.created_at || "";
  }

  function hasNewStory() {
    const latest = latestStoryAt();
    return Boolean(latest && (!state.storySeenLatestAt || new Date(latest) > new Date(state.storySeenLatestAt)));
  }

  function storySummary(text) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    return clean.length > 74 ? `${clean.slice(0, 74)}...` : clean;
  }

  function commentCount(postId) {
    return (state.storyComments || []).filter((item) => item.post_id === postId && item.is_active !== false).length;
  }

  function likeCount(postId) {
    return (state.storyLikes || []).filter((item) => item.post_id === postId).length;
  }

  function storyAuthorName(post) {
    return escapeHtml(post.author_name || "이야기");
  }

  async function notifyNewStory(title, body) {
    if (!state.session?.access_token) return;
    try {
      await fetch(PUSH_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + state.session.access_token },
        body: JSON.stringify({
          type: "story",
          title: "새 이야기가 올라왔어요",
          body: `${title} - 댓글로 함께 응원해 주세요.`,
          url: "./"
        })
      });
    } catch (error) {
      /* Push is an encouragement layer; story save should never fail because of it. */
    }
  }

  function storyPreviewHtml() {
    if (!state.session || !["admin", "teacher", "guardian"].includes(state.profile?.role || "visitor")) return "";
    const posts = activeStoryPosts().slice(0, 2);
    if (posts.length === 0) return "";
    const badge = hasNewStory() ? `<span class="story-new-badge">NEW</span>` : "";
    return `<div class="form-panel compact story-preview-card" data-story-preview><div class="section-heading"><h2>새 이야기 ${badge}</h2><button class="secondary-button" type="button" data-view="stories">보러가기</button></div><p class="empty">댓글로 함께 응원해 주세요.</p><div class="story-preview-list">${posts.map((post) => `<button class="story-preview-item" type="button" data-story-preview-open><b>${escapeHtml(post.title)}</b><small>${formatDate(post.created_at)} · ${storyAuthorName(post)} · 댓글 ${commentCount(post.id)} · 좋아요 ${likeCount(post.id)}</small><p>${escapeHtml(storySummary(post.body))}</p></button>`).join("")}</div></div>`;
  }

  const previousHomeViewForStoryEngagement = homeView;
  homeView = function storyEngagementHomeView() {
    const html = previousHomeViewForStoryEngagement();
    const preview = storyPreviewHtml();
    if (!preview || typeof html !== "string") return html;
    const heroIndex = html.indexOf('<div class="hero-panel">');
    if (heroIndex !== -1) return html.slice(0, heroIndex) + preview + html.slice(heroIndex);
    const closeIndex = html.lastIndexOf("</section>");
    return closeIndex === -1 ? html + preview : html.slice(0, closeIndex) + preview + html.slice(closeIndex);
  };

  const previousNavButtonForStoryEngagement = navButton;
  navButton = function storyEngagementNavButton(view, label) {
    const html = previousNavButtonForStoryEngagement(view, label);
    if (view !== "stories" || !hasNewStory() || state.view === "stories") return html;
    return html.replace(String(label), `${label}<span class="story-nav-dot" aria-label="새 이야기"></span>`);
  };

  const previousSetViewForStoryEngagement = setView;
  setView = function storyEngagementSetView(view) {
    if (view === "stories") {
      const latest = latestStoryAt();
      if (latest) {
        state.storySeenLatestAt = latest;
        localStorage.setItem(SEEN_KEY, latest);
      }
    }
    previousSetViewForStoryEngagement(view);
  };

  const previousBindEventsForStoryEngagement = bindEvents;
  bindEvents = function storyEngagementBindEvents(root) {
    previousBindEventsForStoryEngagement(root);

    root.querySelectorAll("[data-story-preview-open]").forEach((button) => {
      button.addEventListener("click", () => setView("stories"));
    });

    root.querySelector("#story-post-form")?.addEventListener("submit", (event) => {
      const wasEditing = Boolean(state.editingStoryPostId);
      if (wasEditing) return;
      const form = new FormData(event.currentTarget);
      const title = String(form.get("title") || "").trim();
      const body = String(form.get("body") || "").trim();
      if (!title || !body) return;

      window.setTimeout(() => {
        const twoMinutesAgo = Date.now() - 120000;
        const saved = activeStoryPosts().some((post) =>
          post.author_id === state.session?.user?.id
          && post.title === title
          && new Date(post.created_at || 0).getTime() >= twoMinutesAgo
        );
        if (saved) notifyNewStory(title, body);
      }, 1800);
    });

    const pushPanel = root.querySelector("[data-push-panel]");
    if (pushPanel) {
      pushPanel.querySelectorAll("label.check-row").forEach((label) => {
        if (label.textContent.includes("이야기")) label.childNodes[label.childNodes.length - 1].textContent = " 이야기 새 글";
      });
      const directTitle = pushPanel.querySelector('input[name="pushTitle"]');
      const directBody = pushPanel.querySelector('textarea[name="pushBody"]');
      if (directTitle) directTitle.placeholder = "예: 새 이야기가 올라왔어요";
      if (directBody) directBody.placeholder = "댓글로 함께 응원해 주세요.";
    }
  };
})();
