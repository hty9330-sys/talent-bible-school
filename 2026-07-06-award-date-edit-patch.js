(() => {
  // 달란트 지급 '수정' 시 관리자만 지급 날짜(created_at)를 변경할 수 있게 한다.
  //  - 수정 화면에만, 관리자에게만 날짜 입력 필드를 노출
  //  - 저장 시 기존 수정 로직 성공 후 created_at을 한 번 더 갱신 (추가 방식)
  //  - total_talents는 금액 변경이 아니면 영향 없음 (트리거가 amount 기준으로만 조정)
  if (typeof state === "undefined") return;

  function toLocalInputValue(iso) {
    // datetime-local 은 로컬 시간 "YYYY-MM-DDTHH:mm" 형식을 기대
    const d = iso ? new Date(iso) : new Date();
    const pad = (x) => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // 지급 수정 폼에 날짜 입력 필드 삽입 (수정 모드 & 관리자)
  if (typeof awardView === "function") {
    const originalAwardView = awardView;
    awardView = function dateEditAwardView() {
      let html = originalAwardView();
      if (state.editingTransactionId && typeof isAdmin === "function" && isAdmin()) {
        const editing = state.transactions.find((t) => t.id === state.editingTransactionId);
        const val = toLocalInputValue(editing && editing.created_at);
        const field = `<label>지급 날짜 (관리자 전용)<input type="datetime-local" name="editDate" value="${val}" /></label>`;
        const anchor = `<div class="action-row"><button class="secondary-button" type="button" data-view="award">취소</button>`;
        if (html.includes(anchor)) html = html.replace(anchor, field + anchor);
      }
      return html;
    };
  }

  // 수정 저장 시 created_at 반영
  if (typeof updateTalentTransaction === "function") {
    const inner = updateTalentTransaction;
    updateTalentTransaction = async function dateEditUpdate(payload) {
      let desiredIso = null;
      if (typeof isAdmin === "function" && isAdmin()) {
        const el = document.querySelector("#award-form [name='editDate']");
        if (el && el.value) {
          const parsed = new Date(el.value);
          if (!isNaN(parsed.getTime())) desiredIso = parsed.toISOString();
        }
      }
      const txId = payload && payload.transactionId;
      const ok = await inner(payload);
      if (!ok || !desiredIso || !txId) return ok;

      const { error } = await state.client
        .from("talent_transactions")
        .update({ created_at: desiredIso })
        .eq("id", txId);
      if (error) {
        setMessage(error.message);
        return ok;
      }
      await loadRemoteData();

      // 날짜를 옮기면 연속 구간이 달라질 수 있으므로 보너스 재계산 (추가만)
      if (payload && payload.studentId && typeof window.__recomputeDailyBibleBonus === "function") {
        const res = await window.__recomputeDailyBibleBonus(payload.studentId);
        if (res && res.added > 0) {
          await loadRemoteData();
          setMessage(`날짜 수정 반영 · 소급 연속 보너스 +${res.sum} 달란트가 지급되었습니다.`);
        }
      }
      return ok;
    };
  }
})();
