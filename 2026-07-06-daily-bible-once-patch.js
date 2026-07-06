(() => {
  // "매일성경읽기" 달란트는 한 아이당 하루(Asia/Seoul 기준) 1회만 지급되도록 제한한다.
  if (typeof state === "undefined") return;

  const DAILY_BIBLE_REASON = "매일성경읽기";

  // 주어진 시각을 Asia/Seoul 기준 YYYY-MM-DD 문자열로 변환
  function seoulDayKey(value) {
    const date = value ? new Date(value) : new Date();
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date); // en-CA => "2026-07-06"
  }

  // 해당 아이가 '오늘(Seoul)' 이미 매일성경읽기 달란트를 받았는지 DB에서 직접 확인
  // (state.transactions 캐시는 최근 80건 제한이 있어 신뢰할 수 없으므로 매번 조회한다)
  async function findDailyBibleOnDay(studentId, dayKey, excludeId) {
    const { data, error } = await state.client
      .from("talent_transactions")
      .select("id, created_at")
      .eq("student_id", studentId)
      .eq("reason", DAILY_BIBLE_REASON)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) return { error };
    const hit = (data || []).some(
      (row) => row.id !== excludeId && seoulDayKey(row.created_at) === dayKey
    );
    return { hit };
  }

  // ---- awardTalent 래핑 (신규 지급) ----
  if (typeof awardTalent === "function") {
    const originalAwardTalent = awardTalent;
    awardTalent = async function guardedAwardTalent(payload) {
      if (payload && payload.reason === DAILY_BIBLE_REASON) {
        const student = getStudent(payload.studentId);
        if (student) {
          const { hit, error } = await findDailyBibleOnDay(student.id, seoulDayKey());
          if (error) { setMessage(error.message); return false; }
          if (hit) {
            setMessage(`${student.name}은(는) 오늘 이미 '매일성경읽기' 달란트를 받았습니다. (하루 1회)`);
            return false;
          }
        }
      }
      return originalAwardTalent(payload);
    };
  }

  // ---- updateTalentTransaction 래핑 (수정으로 인한 우회 방지) ----
  if (typeof updateTalentTransaction === "function") {
    const originalUpdateTalent = updateTalentTransaction;
    updateTalentTransaction = async function guardedUpdateTalent(payload) {
      if (payload && payload.reason === DAILY_BIBLE_REASON) {
        const transaction = state.transactions.find((item) => item.id === payload.transactionId);
        const student = getStudent(payload.studentId);
        if (transaction && student) {
          // 수정은 created_at을 바꾸지 않으므로 원래 지급일 기준으로 검사
          const dayKey = seoulDayKey(transaction.created_at);
          const { hit, error } = await findDailyBibleOnDay(student.id, dayKey, transaction.id);
          if (error) { setMessage(error.message); return false; }
          if (hit) {
            setMessage(`${student.name}은(는) 그 날 이미 '매일성경읽기' 기록이 있습니다. (하루 1회)`);
            return false;
          }
        }
      }
      return originalUpdateTalent(payload);
    };
  }
})();
