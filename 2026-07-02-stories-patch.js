(() => {
  if (typeof state === "undefined") return;

  state.storyTab = state.storyTab || "announcements";
  state.storyPosts = state.storyPosts || [];
  state.storyComments = state.storyComments || [];
  state.storyLikes = state.storyLikes || [];
  state.editingStoryPostId = state.editingStoryPostId || "";
  state.editingStoryCommentId = state.editingStoryCommentId || "";

  function storyRoleAllowed() {
    return ["admin", "teacher", "guardian"].includes(state.profile?.role || "visitor");
  }

  function canManageStoryItem(authorId) {
    return isAdmin() || authorId === state.session?.user?.id;
  }

  function storyAuthor(item) {
    return escapeHtml(item.author_name || "사용자");
  }

  function stripAnnouncementFeed(html) {
    return html.replace(/<section class="feed announcement-feed">[\s\S]*?<\/section>/, "");
  }

  const previousHomeViewForStories = homeView;
  homeView = function patchedStoriesHomeView() {
    return stripAnnouncementFeed(previousHomeViewForStories());
  };

  function storiesAnnouncementPanel() {
    const activeItems = (state.announcements || []).filter((item) => item.is_active !== false);
    return `<section class="feed announcement-feed"><h2>교회소식</h2>${activeItems.length === 0 ? `<p class="empty">등록된 교회소식이 없습니다.</p>` : ""}${activeItems.map((item) => `<div class="feed-item announcement-item"><span><b>${escapeHtml(item.title)}</b></span><small>${formatDate(item.created_at)}</small><p>${escapeHtml(item.body)}</p></div>`).join("")}</section>`;
  }

  function storyPostForm() {
    const editing = state.storyPosts.find((item) => item.id === state.editingStoryPostId);
    return `<form class="form-panel compact" id="story-post-form"><h3>${editing ? "이야기 수정" : "이야기 쓰기"}</h3><label>제목<input name="title" required value="${escapeHtml(editing?.title || "")}" /></label><label>내용<textarea name="body" required>${escapeHtml(editing?.body || "")}</textarea></label><div class="action-row">${editing ? `<button class="secondary-button" type="button" data-cancel-story-post-edit>취소</button>` : `<span></span>`}<button class="primary-button" type="submit">${editing ? "수정 저장" : "게시"}</button></div></form>`;
  }

  function storyCommentForm(postId) {
    const editing = state.storyComments.find((item) => item.id === state.editingStoryCommentId && item.post_id === postId);
    return `<form class="story-comment-form" data-story-comment-form="${postId}"><input name="body" required placeholder="댓글을 입력하세요." value="${escapeHtml(editing?.body || "")}" /><button class="secondary-button" type="submit">${editing ? "수정" : "댓글"}</button>${editing ? `<button class="secondary-button" type="button" data-cancel-story-comment-edit>취소</button>` : ""}</form>`;
  }

  function storyBoardPanel() {
    const userId = state.session?.user?.id;
    const posts = state.storyPosts.filter((item) => item.is_active !== false);
    return `<section class="stack story-board">${storyPostForm()}<div class="feed story-feed"><h2>이야기 게시판</h2>${posts.length === 0 ? `<p class="empty">아직 등록된 이야기가 없습니다.</p>` : ""}${posts.map((post) => {
      const comments = state.storyComments.filter((item) => item.post_id === post.id && item.is_active !== false);
      const likes = state.storyLikes.filter((item) => item.post_id === post.id);
      const liked = likes.some((item) => item.user_id === userId);
      return `<article class="feed-item story-post"><div class="story-post-head"><span><b>${escapeHtml(post.title)}</b><small>${formatDate(post.created_at)} · ${storyAuthor(post)}</small></span><button class="secondary-button like-button ${liked ? "active" : ""}" type="button" data-toggle-story-like="${post.id}">좋아요 ${likes.length}</button></div><p>${escapeHtml(post.body)}</p>${canManageStoryItem(post.author_id) ? `<div class="feed-actions"><button class="secondary-button edit-button" type="button" data-edit-story-post="${post.id}">수정</button><button class="secondary-button delete-button" type="button" data-delete-story-post="${post.id}">삭제</button></div>` : ""}<div class="story-comments">${comments.map((comment) => `<div class="story-comment"><span><strong>${storyAuthor(comment)}</strong><small>${formatDate(comment.created_at)}</small></span><p>${escapeHtml(comment.body)}</p>${canManageStoryItem(comment.author_id) ? `<div class="feed-actions"><button class="secondary-button edit-button" type="button" data-edit-story-comment="${comment.id}">수정</button><button class="secondary-button delete-button" type="button" data-delete-story-comment="${comment.id}">삭제</button></div>` : ""}</div>`).join("")}${storyCommentForm(post.id)}</div></article>`;
    }).join("")}</div></section>`;
  }

  function storiesView() {
    if (!storyRoleAllowed()) return `<section class="stack"><div class="hero-panel"><span>권한 필요</span><strong>들사람이야기</strong><p>관리자가 권한을 부여한 뒤 사용할 수 있습니다.</p></div></section>`;
    const tabs = [["announcements", "교회소식"], ["board", "이야기 게시판"]];
    return `<section class="stack stories-view"><div class="section-heading"><h2>들사람이야기</h2><span>교회소식과 소통</span></div><div class="quick-grid story-tabs">${tabs.map(([value, label]) => `<button class="${state.storyTab === value ? "active" : ""}" type="button" data-story-tab="${value}">${label}</button>`).join("")}</div>${state.storyTab === "board" ? storyBoardPanel() : storiesAnnouncementPanel()}</section>`;
  }

  const previousClearRemoteStateForStories = clearRemoteState;
  clearRemoteState = function patchedStoriesClearRemoteState() {
    previousClearRemoteStateForStories();
    state.storyPosts = [];
    state.storyComments = [];
    state.storyLikes = [];
    state.editingStoryPostId = "";
    state.editingStoryCommentId = "";
  };

  const previousLoadRemoteDataForStories = loadRemoteData;
  loadRemoteData = async function patchedStoriesLoadRemoteData() {
    await previousLoadRemoteDataForStories();
    if (!state.client || !state.session || !storyRoleAllowed()) return;
    try {
      const [postsResult, commentsResult, likesResult] = await Promise.all([
        state.client.from("story_posts").select("*, author:users!story_posts_author_id_fkey(name,email)").order("created_at", { ascending: false }).limit(80),
        state.client.from("story_comments").select("*, author:users!story_comments_author_id_fkey(name,email)").order("created_at", { ascending: true }).limit(300),
        state.client.from("story_likes").select("post_id,user_id,created_at")
      ]);
      state.storyPosts = (postsResult.data || []).map((item) => ({ ...item, author_name: item.author?.name || item.author?.email || "" }));
      state.storyComments = (commentsResult.data || []).map((item) => ({ ...item, author_name: item.author?.name || item.author?.email || "" }));
      state.storyLikes = likesResult.data || [];
    } catch {
      state.storyPosts = [];
      state.storyComments = [];
      state.storyLikes = [];
    }
  };

  layout = function patchedStoriesLayout(content) {
    const modeText = isConfigured()
      ? state.session
        ? `${escapeHtml(currentTeacherName())} · ${roleLabel(state.profile?.role)}`
        : "Supabase 연결됨"
      : "설정 필요";
    const navItems = [["home", "홈"]];
    if (storyRoleAllowed()) {
      navItems.push(["students", "아이"]);
      if (isStaff()) navItems.push(["award", "지급"]);
      navItems.push(["stories", "이야기"]);
      navItems.push(["bible", "학습"]);
      if (isAdmin()) navItems.push(["admin", "관리"]);
    }
    return `<div class="app-shell"><header class="topbar"><div><div class="church-title"><img class="church-logo" src="./assets/2026-06-30-deulsaram-header-logo.png" alt="들사람교회" /></div><p class="eyebrow">달란트 성경학교</p><h1>아이들의 말씀과 성장을 함께 기록해요</h1></div><div class="topbar-actions">${state.session ? `<button class="ghost-button" type="button" data-action="logout">로그아웃</button>` : `<button class="ghost-button" type="button" data-view="login">로그인</button>`}${isAdmin() ? `<button class="ghost-button" type="button" data-view="settings">설정</button>` : ""}</div></header><div class="notice">${modeText}${state.loading ? " · 불러오는 중" : ""}</div>${state.message ? `<div class="toast">${escapeHtml(state.message)}</div>` : ""}<main>${content}</main><nav class="bottom-nav" aria-label="주요 메뉴">${navItems.map(([view, label]) => navButton(view, label)).join("")}</nav></div>`;
  };

  const previousSetViewForStories = setView;
  setView = function patchedStoriesSetView(view) {
    if (view === "stories") {
      if (!storyRoleAllowed()) {
        state.view = "home";
        state.message = "관리자가 권한을 부여한 뒤 사용할 수 있습니다.";
        render();
        return;
      }
      state.view = "stories";
      state.message = "";
      render();
      return;
    }
    previousSetViewForStories(view);
  };

  render = function patchedStoriesRender() {
    const root = document.getElementById("root");
    const views = { home: homeView, students: studentsView, student: studentView, award: awardView, note: noteView, bible: bibleView, stories: storiesView, admin: adminView, settings: settingsView, login: loginView };
    if (isConfigured() && !state.session) state.view = "login";
    if (state.session && state.view === "stories" && !storyRoleAllowed()) state.view = "home";
    root.innerHTML = layout((views[state.view] || homeView)());
    bindEvents(root);
  };

  async function saveStoryPost(payload) {
    if (!storyRoleAllowed()) return;
    const editing = state.storyPosts.find((item) => item.id === state.editingStoryPostId);
    const row = { title: payload.title, body: payload.body, author_id: state.session.user.id };
    const result = editing
      ? await state.client.from("story_posts").update({ title: row.title, body: row.body, updated_at: new Date().toISOString() }).eq("id", editing.id)
      : await state.client.from("story_posts").insert(row);
    if (result.error) return setMessage(result.error.message);
    state.editingStoryPostId = "";
    await loadRemoteData();
    state.message = "이야기를 저장했습니다.";
    render();
  }

  async function deleteStoryPost(id) {
    const { error } = await state.client.from("story_posts").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return setMessage(error.message);
    await loadRemoteData();
    state.message = "이야기를 삭제했습니다.";
    render();
  }

  async function saveStoryComment(postId, body) {
    if (!storyRoleAllowed()) return;
    const editing = state.storyComments.find((item) => item.id === state.editingStoryCommentId);
    const result = editing
      ? await state.client.from("story_comments").update({ body, updated_at: new Date().toISOString() }).eq("id", editing.id)
      : await state.client.from("story_comments").insert({ post_id: postId, body, author_id: state.session.user.id });
    if (result.error) return setMessage(result.error.message);
    state.editingStoryCommentId = "";
    await loadRemoteData();
    state.message = "댓글을 저장했습니다.";
    render();
  }

  async function deleteStoryComment(id) {
    const { error } = await state.client.from("story_comments").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return setMessage(error.message);
    await loadRemoteData();
    state.message = "댓글을 삭제했습니다.";
    render();
  }

  async function toggleStoryLike(postId) {
    const userId = state.session?.user?.id;
    const liked = state.storyLikes.some((item) => item.post_id === postId && item.user_id === userId);
    const result = liked
      ? await state.client.from("story_likes").delete().eq("post_id", postId).eq("user_id", userId)
      : await state.client.from("story_likes").insert({ post_id: postId, user_id: userId });
    if (result.error) return setMessage(result.error.message);
    await loadRemoteData();
    render();
  }

  const previousBindEventsForStories = bindEvents;
  bindEvents = function patchedStoriesBindEvents(root) {
    previousBindEventsForStories(root);
    root.querySelectorAll("[data-story-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        state.storyTab = button.dataset.storyTab;
        state.editingStoryPostId = "";
        state.editingStoryCommentId = "";
        render();
      });
    });
    root.querySelector("#story-post-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      await saveStoryPost({
        title: String(form.get("title") || "").trim(),
        body: String(form.get("body") || "").trim()
      });
    });
    root.querySelector("[data-cancel-story-post-edit]")?.addEventListener("click", () => {
      state.editingStoryPostId = "";
      render();
    });
    root.querySelectorAll("[data-edit-story-post]").forEach((button) => {
      button.addEventListener("click", () => {
        state.editingStoryPostId = button.dataset.editStoryPost;
        render();
      });
    });
    root.querySelectorAll("[data-delete-story-post]").forEach((button) => {
      button.addEventListener("click", () => deleteStoryPost(button.dataset.deleteStoryPost));
    });
    root.querySelectorAll("[data-toggle-story-like]").forEach((button) => {
      button.addEventListener("click", () => toggleStoryLike(button.dataset.toggleStoryLike));
    });
    root.querySelectorAll("[data-story-comment-form]").forEach((formElement) => {
      formElement.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await saveStoryComment(event.currentTarget.dataset.storyCommentForm, String(form.get("body") || "").trim());
      });
    });
    root.querySelector("[data-cancel-story-comment-edit]")?.addEventListener("click", () => {
      state.editingStoryCommentId = "";
      render();
    });
    root.querySelectorAll("[data-edit-story-comment]").forEach((button) => {
      button.addEventListener("click", () => {
        state.editingStoryCommentId = button.dataset.editStoryComment;
        render();
      });
    });
    root.querySelectorAll("[data-delete-story-comment]").forEach((button) => {
      button.addEventListener("click", () => deleteStoryComment(button.dataset.deleteStoryComment));
    });
  };
})();
