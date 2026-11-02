(() => {
  if (typeof state === "undefined") return;

  // 2026-11-02 달란트 차감에 '차감 시각(날짜)' 선택 기능 추가
  //  - 기존 2026-07-06-talent-deduct-patch.js 는 created_at 을 지정하지 않아 항상 현재 시각으로만 기록됨.
  //  - 이 패치는 차감 화면(#deduct-form)에 datetime-local 입력을 추가하고,
  //    제출 시 선택한 시각을 talent_transactions.created_at 으로 저장한다.
  //  - 원본 파일은 수정하지 않는다. 차감 화면이 렌더된 뒤 날짜 입력을 끼워 넣고,
  //    document 의 submit 캡처 단계에서 기존 핸들러보다 먼저 가로채 처리한다.
  //  - index.html 에서 2026-07-06-talent-deduct-patch.js 뒤에 로드되어야 한다.

  const DEDUCT_REASON = "차감";

  function toLocalDatetimeInputValue(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  // 날짜 지정이 가능한 차감 처리 (기존 deductTalent 과 동일한 검증 + created_at 추가)
  async function deductTalentAt(payload) {
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

    const row = {
      student_id: student.id,
      teacher_id: state.session.user.id,
      amount: -n,
      reason: DEDUCT_REASON,
      memo
    };
    let whenText = "";
    if (payload.at) {
      const d = new Date(payload.at);
      if (!Number.isNaN(d.getTime())) {
        row.created_at = d.toISOString();
        whenText = ` (${new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(d)} 기준)`;
      }
    }

    const { error } = await state.client.from("talent_transactions").insert(row);
    if (error) {
      setMessage(error.message);
      return false;
    }
    await loadRemoteData();
    state.selectedStudentId = student.id;
    setMessage(`${student.name}에게서 ${n} 달란트를 차감했습니다.${whenText} (사유: ${memo})`);
    return true;
  }

  // 차감 화면 렌더 후 날짜 입력을 끼워 넣는다. (원본 render 를 감싸되 DOM 만 보강)
  if (typeof render === "function") {
    const previousRenderForDeductDate = render;
    render = function deductDateRender() {
      previousRenderForDeductDate();
      if (state.view !== "deduct" || !(typeof isAdmin === "function" && isAdmin())) return;
      const root = document.getElementById("root");
      const form = root?.querySelector("#deduct-form");
      if (!form || form.querySelector("input[name='deductAt']")) return;

      const dateLabel = document.createElement("label");
      dateLabel.innerHTML = `차감 시각 (날짜)<input type="datetime-local" name="deductAt" value="${toLocalDatetimeInputValue(new Date())}" /><small class="hint">비워 두거나 그대로 두면 현재 시각으로 기록됩니다. 지난 날짜를 고르면 그 날짜로 소급 기록됩니다.</small>`;
      const memoField = form.querySelector("textarea[name='memo']")?.closest("label");
      const actionRow = form.querySelector(".action-row");
      if (memoField) memoField.insertAdjacentElement("afterend", dateLabel);
      else if (actionRow) actionRow.insertAdjacentElement("beforebegin", dateLabel);
      else form.appendChild(dateLabel);
    };
  }

  // 제출을 캡처 단계에서 먼저 가로채, 선택한 날짜로 차감한다. (리스너는 한 번만 등록)
  if (!window.__deductDateSubmitBound) {
    window.__deductDateSubmitBound = true;
    document.addEventListener(
      "submit",
      async (event) => {
        const form = event.target;
        if (!form || form.id !== "deduct-form") return;
        if (state.view !== "deduct") return;
        const dateInput = form.querySelector("input[name='deductAt']");
        if (!dateInput) return; // 날짜 입력이 없으면(미보강) 기존 핸들러에 맡긴다.

        event.preventDefault();
        event.stopImmediatePropagation(); // 기존 제출 핸들러(현재 시각 차감)가 실행되지 않도록 차단

        const data = new FormData(form);
        const ok = await deductTalentAt({
          studentId: data.get("studentId"),
          amount: data.get("deductAmount"),
          memo: data.get("memo"),
          at: data.get("deductAt")
        });
        if (ok) {
          state.view = "student";
          render();
        }
      },
      true
    );
  }
})();
