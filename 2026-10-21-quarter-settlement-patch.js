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

  async function runQuarterSettlement() {
    if (!(typeof isAdmin === "function" && isAdmin())) {
      setMessage("관리자만 분기 마감을 처리할 수 있습니다.");
      return false;
    }
    const students = state.students || [];
    if (!students.length) {
      setMessage("등록된 아이가 없습니다.");
      return false;
    }
    if (!window.confirm(`전체 아이 ${students.length}명의 분기를 마감합니다.\n각자의 현재 보유 달란트가 '이전 분기 잔액'으로 저장되고, 다음 분기 적립은 0부터 다시 계산됩니다.\n(보유 달란트 자체는 바뀌지 않습니다)\n\n잔치 차감을 먼저 모두 마쳤는지 확인하세요. 계속할까요?`)) {
      return false;
    }
    const nowIso = new Date().toISOString();
    const results = await Promise.all(students.map((s) =>
      state.client.from("students").update({
        quarter_carryover: Number(s.total_talents || 0),
        quarter_started_at: nowIso
      }).eq("id", s.id)
    ));
    const failed = results.find((r) => r.error);
    if (failed) {
      setMessage(failed.error.message);
      return false;
    }
    await loadRemoteData();
    setMessage(`분기 마감을 완료했습니다. (${students.length}명)`);
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
      wrap.innerHTML = `<div class="action-row"><button class="secondary-button" type="button" data-quarter-settlement>분기 마감 처리 (잔치 정산)</button></div><p class="empty">잔치 차감을 모두 마친 뒤 누르면, 남은 달란트는 다음 분기로 넘어가고 적립 계산이 0부터 다시 시작됩니다.</p>`;
      form.insertAdjacentElement("afterend", wrap);
      root.querySelector("[data-quarter-settlement]")?.addEventListener("click", async () => {
        await runQuarterSettlement();
        render();
      });
    };
  }
})();
