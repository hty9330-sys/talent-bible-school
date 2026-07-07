(() => {
  // 달란트 차감 (관리자 전용)
  //  - 임의의 숫자를 입력해 차감, 사유(메모) 필수
  //  - 차감은 talent_transactions에 amount 음수(-N), reason='차감'으로 기록
  //  - 총 달란트는 트리거가 자동 반영. 잔액(0) 미만으로는 못 내려가므로 초과 차감은 막는다.
  //  - 진입: 아이 상세 화면 / 홈 화면의 '달란트 차감' 버튼 (관리자에게만 노출)
  if (typeof state === "undefined") return;

  const DEDUCT_REASON = "차감";

  async function deductTalent(payload) {
    if (!(typeof isAdmin === "function" && isAdmin())) {
      setMessage("관리자만 달란트를 차감할 수 있습니다.");
      return false;
    }
    const student = getStudent(payload.studentId);
    if (!student) {
      setMessage("아이를 먼저 선택하세요.");
      return false;
    }
    const n = Math.floor(Number(payload.amount));
    if (!Number.isFinite(n) || n <= 0) {
      setMessage("차감할 달란트 수를 1 이상 입력하세요.");
      return false;
    }
    const memo = String(payload.memo || "").trim();
    if (!memo) {
      setMessage("차감 사유(메모)를 입력하세요.");
      return false;
    }
    const balance = Number(student.total_talents || 0);
    if (n > balance) {
      setMessage(`${student.name}의 현재 잔액(${balance})보다 많이 차감할 수 없습니다.`);
      return false;
    }
    const { error } = await state.client.from("talent_transactions").insert({
      student_id: student.id,
      teacher_id: state.session.user.id,
      amount: -n,
      reason: DEDUCT_REASON,
      memo
    });
    if (error) {
      setMessage(error.message);
      return false;
    }
    await loadRemoteData();
    state.selectedStudentId = student.id;
    setMessage(`${student.name}에게서 ${n} 달란트를 차감했습니다. (사유: ${memo})`);
    return true;
  }

  function deductView() {
    const student = getStudent(state.selectedStudentId);
    let html = `<section class="stack"><form class="form-panel" id="deduct-form"><h2>달란트 차감 (관리자)</h2>`;
    html += studentSelect(student ? student.id : "");
    if (student) html += `<p class="empty">현재 잔액: <strong>${student.total_talents}</strong> 달란트</p>`;
    html += `<label>차감할 달란트 수<input type="number" name="deductAmount" min="1" step="1" inputmode="numeric" placeholder="예: 5" required /></label>`;
    html += `<label>차감 사유 (메모)<textarea name="memo" placeholder="예: 달란트 잔치에서 사용" required></textarea></label>`;
    html += `<div class="action-row"><button class="secondary-button" type="button" data-view="student">취소</button><button class="primary-button" type="submit">차감 저장</button></div>`;
    html += `</form>`;
    if (student && typeof transactionFeed === "function") {
      html += transactionFeed("최근 지급·차감 내역", state.transactions.filter((t) => t.student_id === student.id));
    }
    html += `</section>`;
    return html;
  }

  // 차감 화면 렌더링 (render 래핑)
  if (typeof render === "function") {
    const originalRender = render;
    render = function deductRender() {
      if (state.view === "deduct") {
        if (typeof isConfigured === "function" && isConfigured() && !state.session) {
          state.view = "login";
          return originalRender();
        }
        if (!(typeof isAdmin === "function" && isAdmin())) {
          state.view = state.session ? "home" : "login";
          return originalRender();
        }
        const root = document.getElementById("root");
        root.innerHTML = layout(deductView());
        bindEvents(root);
        root.querySelector("#deduct-form")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const ok = await deductTalent({
            studentId: form.get("studentId"),
            amount: form.get("deductAmount"),
            memo: form.get("memo")
          });
          if (ok) {
            state.view = "student";
            render();
          }
        });
        root.querySelector("#deduct-form select[name='studentId']")?.addEventListener("change", (event) => {
          state.selectedStudentId = event.target.value;
        });
        return;
      }
      return originalRender();
    };
  }

  // 진입 버튼: 아이 상세 화면 (관리자)
  if (typeof studentView === "function") {
    const originalStudentView = studentView;
    studentView = function deductStudentView() {
      let html = originalStudentView();
      if (typeof isAdmin === "function" && isAdmin()) {
        const anchor = `<button class="secondary-button" type="button" data-view="bible">성경 학습</button>`;
        if (html.includes(anchor)) {
          html = html.replace(anchor, anchor + `<button class="secondary-button" type="button" data-view="deduct">달란트 차감</button>`);
        }
      }
      return html;
    };
  }

  // 진입 버튼: 홈 화면 (관리자)
  if (typeof homeView === "function") {
    const originalHomeView = homeView;
    homeView = function deductHomeView() {
      let html = originalHomeView();
      if (typeof isAdmin === "function" && isAdmin()) {
        const anchor = `<button type="button" data-view="bible">성경 학습</button>`;
        if (html.includes(anchor)) {
          html = html.replace(anchor, anchor + `<button type="button" data-view="deduct">달란트 차감</button>`);
        }
      }
      return html;
    };
  }

  // 피드에서 음수 표시 보정: "+-5" → "−5"
  if (typeof transactionFeed === "function") {
    const originalFeed = transactionFeed;
    transactionFeed = function signedFeed(title, items) {
      return originalFeed(title, items).replace(/>\+-(\d+)</g, ">−$1<");
    };
  }
})();
