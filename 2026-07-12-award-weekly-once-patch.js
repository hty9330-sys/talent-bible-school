(() => {
  // 2026-07-12 지급 항목 주 1회 제한 (선생님 전용)
  //  - 선생님은 같은 아이에게 같은 지급 사유를 '일주일(일~토, Asia/Seoul)에 한 번'만 지급 가능
  //  - 관리자는 제한 없음 (수정·보정용)
  //  - 예외(여러 번 허용): '기타', '특별칭찬'
  //  - 자체 로직이 있는 항목은 이 규칙에서 제외: 매일성경읽기(류), 성경학습, 누락, 차감, 영어학습
  //  - 제출 시점에 DB로 이번 주 지급 이력을 확인해 차단
  if (typeof state === "undefined" || typeof awardTalent !== "function") return;

  const RULE_SKIP = new Set([
    "기타",
    "특별칭찬",
    "매일성경읽기",
    "매일성경읽기 보너스",
    "성경학습",
    "누락",
    "차감",
    "영어학습"
  ]);

  function pad2(n) { return String(n).padStart(2, "0"); }
  function seoulTodayISO() {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date())
      .reduce((acc, part) => { acc[part.type] = part.value; return acc; }, {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  // 이번 주(일요일 시작, KST) 범위를 timestamptz 비교용 ISO로 반환
  function currentWeekRangeKST() {
    const [y, m, d] = seoulTodayISO().split("-").map(Number);
    const start = new Date(y, m - 1, d);
    start.setDate(start.getDate() - start.getDay()); // 일요일로 이동
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const fmt = (dt) => `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}T00:00:00+09:00`;
    return { start: fmt(start), end: fmt(end) };
  }

  function isTeacherOnly() {
    const admin = typeof isAdmin === "function" && isAdmin();
    const staff = typeof isStaff === "function" && isStaff();
    return staff && !admin;
  }

  async function alreadyAwardedThisWeek(payload, excludeTransactionId) {
    if (!isTeacherOnly()) return false;            // 관리자·비스태프는 제한 없음
    const reason = payload && payload.reason;
    const studentId = payload && payload.studentId;
    if (!reason || !studentId) return false;
    if (RULE_SKIP.has(reason)) return false;       // 예외 항목
    if (!state.client) return false;
    const { start, end } = currentWeekRangeKST();
    let query = state.client
      .from("talent_transactions")
      .select("id")
      .eq("student_id", studentId)
      .eq("reason", reason)
      .gte("created_at", start)
      .lt("created_at", end);
    if (excludeTransactionId) query = query.neq("id", excludeTransactionId);
    const { data, error } = await query.limit(1);
    if (error) return false;                       // 조회 실패 시 정상 흐름 방해하지 않음
    return Boolean(data && data.length);
  }

  function weeklyOnceMessage(studentName, reason) {
    return `${studentName || "이 아이"}에게는 이번 주에 이미 '${reason}' 달란트를 지급했습니다. 같은 항목은 일주일에 한 번만 지급할 수 있습니다.`;
  }

  const innerAwardTalent = awardTalent;
  awardTalent = async function weeklyOnceAwardTalent(payload) {
    if (await alreadyAwardedThisWeek(payload, null)) {
      const student = typeof getStudent === "function" ? getStudent(payload.studentId) : null;
      setMessage(weeklyOnceMessage(student?.name, payload.reason));
      return false;
    }
    return innerAwardTalent(payload);
  };

  if (typeof updateTalentTransaction === "function") {
    const innerUpdateTalentTransaction = updateTalentTransaction;
    updateTalentTransaction = async function weeklyOnceUpdateTalentTransaction(payload) {
      if (await alreadyAwardedThisWeek(payload, payload && payload.transactionId)) {
        const student = typeof getStudent === "function" ? getStudent(payload.studentId) : null;
        setMessage(weeklyOnceMessage(student?.name, payload.reason));
        return false;
      }
      return innerUpdateTalentTransaction(payload);
    };
  }
})();
