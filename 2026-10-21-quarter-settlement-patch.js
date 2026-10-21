(() => {
  if (typeof state === "undefined") return;

  // 2026-10-21 분기 결산(달란트 잔치)
  //  - students.quarter_carryover: 직전 분기 마감 시점의 보유 달란트 (= 이전 분기부터 가져온 잔액)
  //  - students.quarter_started_at: 현재 분기가 시작된 시각
  //  - 이번 분기 적립 = 현재 보유(total_talents) - quarter_carryover (화면에서 계산, 따로 저장하지 않음)
  //  - 분기 마감(관리자 전용): 잔치에서 차감을 모두 마친 뒤 누르면,
  //    그 시점 보유량이 다음 분기의 '이전 분기 잔액'으로 저장되고 이번 분기 적립은 0부터 다시 계산된다.
  //    보유 달란트 자체는 변하지 않으므로, 쓰고 싶을 때는 보유 전체에서 그대로 차감하면 된다.

  function quarterEarned(student) {
    if (!student) return 0;
    return Number(student.total_talents || 0) - Number(student.quarter_carryover || 0);
  }

  function quarterCarryover(student) {
    return Number(student?.quarter_carryover || 0);
  }

  function toLocalDatetimeInputValue(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  // cutoff 시각까지의 거래 내역을 역산해서, 그 시점 각 아이의 보유 달란트(=이전 분기 잔액)를 구한다.
  // 과거 날짜로 마감할 때(이미 지나간 잔치를 소급 처리할 때) 사용.
  async function fetchBalanceAsOf(cutoffIso) {
    const { data, error } = await state.client
      .from("talent_transactions")
      .select("student_id, amount")
      .lte("created_at", cutoffIso)
      .range(0, 19999);
    if (error) return { error };
    const sums = {};
    (data || []).forEach((tx) => {
      sums[tx.student_id] = (sums[tx.student_id] || 0) + Number(tx.amount);
    });
    return { sums };
  }

  async function runQuarterSettlement(cutoffDate) {
    if (!(typeof isAdmin === "function" && isAdmin())) {
      setMessage("관리자만 분기 마감을 처리할 수 있습니다.");
      return false;
    }
    const students = state.students || [];
    if (!students.length) {
      setMessage("등록된 아이가 없습니다.");
      return false;
    }
    const cutoff = cutoffDate instanceof Date && !Number.isNaN(cutoffDate.getTime()) ? cutoffDate : new Date();
    const cutoffIso = cutoff.toISOString();
    const isPast = cutoff.getTime() < Date.now() - 60000;
    const whenText = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(cutoff);
    if (!window.confirm(`전체 아이 ${students.length}명의 분기를 "${whenText}" 기준으로 마감합니다.\n그 시점까지의 보유 달란트가 '이전 분기 잔액'으로 저장되고, 다음 분기 적립은 0부터 다시 계산됩니다.\n(보유 달란트 자체는 바뀌지 않습니다)\n\n${isPast ? "⚠ 과거 날짜로 소급 마감합니다. 그 시점 이후 거래는 모두 '이번 분기 적립'으로 계산됩니다.\n" : "잔치 차감을 먼저 모두 마쳤는지 확인하세요.\n"}계속할까요?`)) {
      return false;
    }

    let carryoverOf = (s) => Number(s.total_talents || 0);
    if (isPast) {
      const { sums, error } = await fetchBalanceAsOf(cutoffIso);
      if (error) {
        setMessage(error.message);
        return false;
      }
      carryoverOf = (s) => Math.max(0, Number(sums[s.id] || 0));
    }

    const results = await Promise.all(students.map((s) =>
      state.client.from("students").update({
        quarter_carryover: carryoverOf(s),
        quarter_started_at: cutoffIso
      }).eq("id", s.id)
    ));
    const failed = results.find((r) => r.error);
    if (failed) {
      setMessage(failed.error.message);
      return false;
    }
    await loadRemoteData();
    setMessage(`"${whenText}" 기준으로 분기 마감을 완료했습니다. (${students.length}명)`);
    return true;
  }

  // 학생 상세 프로필: 이번 분기 적립 / 이전 분기 잔액 표시
  if (typeof studentView === "function") {
    const previousStudentView = studentView;
    studentView = function quarterStudentView() {
      const html = previousStudentView();
      const student = typeof getStudent === "function" ? getStudent(state.selectedStudentId) : null;
      if (!student || typeof html !== "string") return html;
      const anchor = `<strong>${student.total_talents} 달란트</strong>`;
      if (!html.includes(anchor)) return html;
      const extra = `<p class="empty">이번 분기 적립 ${quarterEarned(student)} · 이전 분기 잔액 ${quarterCarryover(student)}</p>`;
      return html.replace(anchor, anchor + extra);
    };
  }

  // 관리자 전용: 달란트 차감 화면에 '분기 마감' 버튼 추가
  // (deductView는 2026-07-06-talent-deduct-patch.js의 IIFE 내부 지역 함수라 직접 감쌀 수 없어,
  //  render 이후 DOM에 버튼을 직접 삽입하는 방식으로 붙인다.)
  if (typeof render === "function") {
    const previousRenderForQuarter = render;
    render = function quarterRender() {
      previousRenderForQuarter();
      if (state.view !== "deduct" || !(typeof isAdmin === "function" && isAdmin())) return;
      const root = document.getElementById("root");
      const form = root?.querySelector("#deduct-form");
      if (!form || root.querySelector("[data-quarter-settlement]")) return;
      const wrap = document.createElement("div");
      wrap.dataset.quarterSettlementWrap = "true";
      wrap.className = "form-panel compact";
      wrap.innerHTML = `<h3>분기 마감 처리 (잔치 정산)</h3><label>마감 기준 시각<input type="datetime-local" data-quarter-settlement-at value="${toLocalDatetimeInputValue(new Date())}" /></label><div class="action-row"><button class="secondary-button" type="button" data-quarter-settlement>분기 마감 처리</button></div><p class="empty">잔치 차감을 모두 마친 뒤 누르면, 기준 시각까지의 보유 달란트가 다음 분기로 넘어가고 적립 계산이 0부터 다시 시작됩니다. 이미 지나간 잔치를 소급 처리하려면 기준 시각을 그날로 바꾸세요.</p>`;
      form.insertAdjacentElement("afterend", wrap);
      root.querySelector("[data-quarter-settlement]")?.addEventListener("click", async () => {
        const input = root.querySelector("[data-quarter-settlement-at]");
        const cutoff = input?.value ? new Date(input.value) : new Date();
        await runQuarterSettlement(cutoff);
        render();
      });
    };
  }
})();
