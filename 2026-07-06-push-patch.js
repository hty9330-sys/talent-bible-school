(() => {
  if (typeof state === "undefined") return;

  // 2026-07-06 PWA 푸시 알림: 구독 관리 + 알림 종류 설정 + 관리자 직접 발송
  const VAPID_PUBLIC_KEY = "BHuXysH7BmyNT9PmslpdWEXOvOcOk0UQ-5c1SF-mHTG9_cueM9WKsp3Bt6IxNmqD-TFbZjawtVwksmjPYRhmovY";
  const PUSH_FUNCTION_URL = "https://eesdzgehomzccrrykrqb.supabase.co/functions/v1/send-push";
  const prefLabels = [["announcement", "📢 공지"], ["story", "💬 이야기"], ["note", "📝 학생 메모"]];

  state.push = state.push || { checked: false, supported: false, needInstall: false, permission: "default", subscribed: false, prefs: { announcement: true, story: true, note: true }, busy: false };

  function pushSupported() {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  }

  function isIosNeedInstall() {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    return isIos && !standalone;
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  async function refreshPushStatus() {
    state.push.supported = pushSupported();
    state.push.needInstall = isIosNeedInstall();
    state.push.permission = "Notification" in window ? Notification.permission : "denied";
    state.push.subscribed = false;
    if (state.push.supported && !state.push.needInstall) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub && state.session) {
          state.push.subscribed = true;
          const { data } = await state.client.from("push_subscriptions").select("prefs").eq("endpoint", sub.endpoint).maybeSingle();
          if (data?.prefs) state.push.prefs = { announcement: true, story: true, note: true, ...data.prefs };
        }
      } catch (error) { /* 무시 */ }
    }
    state.push.checked = true;
    render();
  }

  async function enablePush() {
    if (state.push.busy || !state.session) return;
    state.push.busy = true; render();
    try {
      const permission = await Notification.requestPermission();
      state.push.permission = permission;
      if (permission !== "granted") { state.message = "알림 권한이 허용되지 않았습니다. 브라우저 설정에서 허용해 주세요."; state.push.busy = false; render(); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
      const raw = sub.toJSON();
      const { error } = await state.client.from("push_subscriptions").upsert({
        user_id: state.session.user.id,
        endpoint: sub.endpoint,
        p256dh: raw.keys.p256dh,
        auth: raw.keys.auth,
        prefs: state.push.prefs,
        updated_at: new Date().toISOString()
      }, { onConflict: "endpoint" });
      if (error) { state.message = "알림 등록 실패: " + error.message; }
      else { state.push.subscribed = true; state.message = "이 기기에서 푸시 알림을 받습니다."; }
    } catch (error) {
      state.message = "알림 등록 중 오류가 발생했습니다.";
    }
    state.push.busy = false; render();
  }

  async function disablePush() {
    if (state.push.busy) return;
    state.push.busy = true; render();
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await state.client.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      state.push.subscribed = false;
      state.message = "이 기기의 푸시 알림을 껐습니다.";
    } catch (error) { state.message = "알림 해제 중 오류가 발생했습니다."; }
    state.push.busy = false; render();
  }

  async function updatePref(key, value) {
    state.push.prefs[key] = value;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await state.client.from("push_subscriptions").update({ prefs: state.push.prefs, updated_at: new Date().toISOString() }).eq("endpoint", sub.endpoint);
    } catch (error) { /* 무시 */ }
    render();
  }

  async function sendDirectPush(title, body) {
    if (!isAdmin()) return;
    try {
      const token = state.session?.access_token;
      const response = await fetch(PUSH_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ type: "direct", title, body })
      });
      const result = await response.json();
      state.message = response.ok ? `알림을 발송했습니다. (수신 기기 ${result.sent}대)` : "알림 발송 실패";
    } catch (error) { state.message = "알림 발송 중 오류가 발생했습니다."; }
    render();
  }

  function pushPanelHtml() {
    if (!state.session || !isStaff()) return "";
    let bodyHtml = "";
    if (!state.push.checked) {
      bodyHtml = `<p class="empty">알림 상태를 확인하는 중입니다...</p>`;
    } else if (!state.push.supported) {
      bodyHtml = `<p class="empty">이 브라우저는 푸시 알림을 지원하지 않습니다.</p>`;
    } else if (state.push.needInstall) {
      bodyHtml = `<p class="empty">iPhone은 Safari 공유 버튼 → "홈 화면에 추가"로 앱을 설치한 뒤 알림을 켤 수 있습니다.</p>`;
    } else if (state.push.permission === "denied") {
      bodyHtml = `<p class="empty">알림 권한이 차단되어 있습니다. 브라우저(또는 앱) 설정에서 알림을 허용해 주세요.</p>`;
    } else if (!state.push.subscribed) {
      bodyHtml = `<p class="empty">공지·이야기·학생 메모 등록 시 이 기기로 알림을 받습니다.</p><button class="primary-button" type="button" data-push-enable ${state.push.busy ? "disabled" : ""}>알림 켜기</button>`;
    } else {
      bodyHtml = `<p class="empty">이 기기에서 알림을 받는 중입니다. 받을 알림을 선택하세요.</p>${prefLabels.map(([key, label]) => `<label class="check-row"><input type="checkbox" data-push-pref="${key}" ${state.push.prefs[key] !== false ? "checked" : ""} /> ${label}</label>`).join("")}<button class="secondary-button" type="button" data-push-disable ${state.push.busy ? "disabled" : ""}>알림 끄기</button>`;
    }
    const adminSend = isAdmin() && state.push.checked ? `<details><summary>관리자 직접 발송</summary><form id="push-direct-form"><label>제목<input name="pushTitle" required maxlength="100" placeholder="예: 오늘은 성경학교가 있습니다" /></label><label>내용<textarea name="pushBody" required maxlength="300" placeholder="모든 알림 사용자에게 발송됩니다."></textarea></label><button class="primary-button" type="submit">전체 발송</button></form></details>` : "";
    return `<div class="form-panel compact" data-push-panel><h2>🔔 푸시 알림</h2>${bodyHtml}${adminSend}</div>`;
  }

  const previousHomeViewForPush = homeView;
  homeView = function pushPatchedHomeView() {
    const html = previousHomeViewForPush();
    if (typeof html !== "string" || !state.session || !isStaff()) return html;
    const panel = pushPanelHtml();
    const index = html.lastIndexOf("</section>");
    if (index === -1) return html;
    return html.slice(0, index) + panel + html.slice(index);
  };

  const previousBindEventsForPush = bindEvents;
  bindEvents = function pushPatchedBindEvents(root) {
    previousBindEventsForPush(root);
    if (!root.querySelector("[data-push-panel]")) {
      if (!state.push.checked && state.session && state.view === "home") refreshPushStatus();
      return;
    }
    if (!state.push.checked) refreshPushStatus();
    root.querySelector("[data-push-enable]")?.addEventListener("click", enablePush);
    root.querySelector("[data-push-disable]")?.addEventListener("click", disablePush);
    root.querySelectorAll("[data-push-pref]").forEach((box) => {
      box.addEventListener("change", () => updatePref(box.dataset.pushPref, box.checked));
    });
    root.querySelector("#push-direct-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const title = String(form.get("pushTitle") || "").trim();
      const body = String(form.get("pushBody") || "").trim();
      if (!title || !body) return;
      if (!window.confirm("알림을 켠 모든 사용자에게 발송합니다. 계속할까요?")) return;
      await sendDirectPush(title, body);
    });
  };
})();
