(() => {
  // 달란트 지급 '수정' 시 관리자만 지급 날짜(created_at)를 변경할 수 있게 한다.
  //  - 수정 화면에만, 관리자에게만 날짜 입력 필드를 노출
  //  - 관리자 수정은 사유·금액·메모·날짜를 '한 번의 update'로 원자적으로 반영한다.
  //    (사유를 매일성경읽기로 바꾸며 날짜를 빈 날로 옮기는 경우, 2단계 수정으로 생기던
  //     '하루1회' 오탐/중복충돌을 방지)
  //  - 하루1회 검사는 '옮겨갈 목표 날짜' 기준으로 수행한다.
  if (typeof state === "undefined") return;

  const DAILY_BIBLE_REASON = "매일성경읽기";

  function toLocalInputValue(iso) {
    const d = iso ? new Date(iso) : new Date();
    const pad = (x) => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function seoulDayKey(value) {
    const date = value ? new Date(value) : new Date();
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);
  }

  // 수정 폼에 날짜 입력 필드 삽입 (수정 모드 & 관리자)
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

  if (typeof updateTalentTransaction === "function") {
    const inner = updateTalentTransaction;
    updateTalentTransaction = async function dateEditUpdate(payload) {
      // 관리자 + 날짜필드가 있을 때만 전용 처리, 그 외엔 기존 로직
      let desiredIso = null;
      if (typeof isAdmin === "function" && isAdmin()) {
        const el = document.querySelector("#award-form [name='editDate']");
        if (el && el.value) {
          const parsed = new Date(el.value);
          if (!isNaN(parsed.getTime())) desiredIso = parsed.toISOString();
        }
      }
      if (!desiredIso) return inner(payload);

      const txId = payload && payload.transactionId;
      const transaction = state.transactions.find((item) => item.id === txId);
      const student = typeof getStudent === "function" ? getStudent(payload.studentId) : null;
      if (!transaction || !student) {
        setMessage("수정할 지급 기록을 찾지 못했습니다.");
        return false;
      }

      const amount = Number(payload.amount);
      const allowed = [1, 2, 3, 4, 5];
      if (!allowed.includes(amount)) {
        setMessage(`지급 가능한 달란트는 ${allowed.join(", ")} 뿐입니다.`);
        return false;
      }

      const targetDay = seoulDayKey(desiredIso);

      // 매일성경읽기로 두거나 바꾸는 경우: '옮겨갈 날짜' 기준으로 하루1회 검사
      if (payload.reason === DAILY_BIBLE_REASON) {
        const { data, error: qErr } = await state.client
          .from("talent_transactions")
          .select("id, created_at")
          .eq("student_id", student.id)
          .eq("reason", DAILY_BIBLE_REASON)
          .limit(400);
        if (qErr) {
          setMessage(qErr.message);
          return false;
        }
        const hit = (data || []).some((r) => r.id !== txId && seoulDayKey(r.created_at) === targetDay);
        if (hit) {
          setMessage(`${student.name}은(는) ${targetDay}에 이미 '매일성경읽기' 기록이 있습니다. (하루 1회)`);
          return false;
        }
      }

      // 사유·금액·메모·날짜를 한 번에 갱신 (중간 상태 충돌 방지)
      const { error } = await state.client
        .from("talent_transactions")
        .update({
          student_id: student.id,
          amount,
          reason: payload.reason,
          memo: payload.memo || null,
          created_at: desiredIso
        })
        .eq("id", txId);
      if (error) {
        setMessage(error.message);
        return false;
      }

      state.editingTransactionId = "";
      await loadRemoteData();
      state.selectedStudentId = student.id;

      // 날짜/사유 변경으로 연속 구간이 달라질 수 있으므로 보너스 재계산 (추가만)
      let bonusMsg = "";
      if (typeof window.__recomputeDailyBibleBonus === "function") {
        const res = await window.__recomputeDailyBibleBonus(student.id);
        if (res && res.added > 0) {
          await loadRemoteData();
          bonusMsg = ` · 소급 연속 보너스 +${res.sum}`;
        }
      }
      setMessage(`${student.name}의 지급 기록을 수정했습니다.${bonusMsg}`);
      return true;
    };
  }
})();
