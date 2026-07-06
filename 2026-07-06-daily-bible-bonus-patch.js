(() => {
  // 매일성경읽기 연속 보너스 (소급 반영 · 추가만/회수 없음)
  //  - 규칙: 매일 +1(수동) / 연속 14일 +2 / 28일 +3, 이후 +2·+3 반복 / 결석 시 리셋(무관용)
  //  - 보너스는 "그 아이의 전체 읽기 기록"에서 매번 재계산한다.
  //    → 지급할 때, 관리자가 날짜를 소급 수정할 때마다 자동 실행되어 빠진 보너스를 채운다.
  //  - 추가만: 연속이 새로 달성되면 보너스를 넣지만, 이미 지급된 보너스는 절대 회수하지 않는다.
  //  - 연속일 = 사유 '매일성경읽기' 기록의 Asia/Seoul 날짜. 보너스는 사유 '매일성경읽기 보너스'로 기록.
  if (typeof state === "undefined") return;

  const DAILY_BIBLE_REASON = "매일성경읽기";
  const BONUS_REASON = "매일성경읽기 보너스";

  function seoulDayKey(value) {
    const date = value ? new Date(value) : new Date();
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);
  }

  // YYYY-MM-DD 에 delta일 (타임존 독립, 한국은 DST 없음)
  function addDays(dayKey, delta) {
    const [y, m, d] = dayKey.split("-").map(Number);
    const t = Date.UTC(y, m - 1, d) + delta * 86400000;
    const dt = new Date(t);
    const pad = (x) => String(x).padStart(2, "0");
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  }

  // 해당 Seoul 날짜의 정오(12:00 KST = 03:00 UTC) ISO → 보너스를 '그 날'로 기록
  function kstNoonIso(dayKey) {
    return `${dayKey}T03:00:00.000Z`;
  }

  // 연속 구간 내 위치 pos일 때 보너스: 14→+2, 28→+3, 42→+2, 56→+3 ...
  function bonusForStreak(pos) {
    if (pos <= 0) return 0;
    const mod = pos % 28;
    if (mod === 14) return 2;
    if (mod === 0) return 3;
    return 0;
  }

  // 전체 기록에서 보너스를 재계산 (추가만). 반환: { added, sum } 또는 { error }
  async function recompute(studentId) {
    // 1) 읽은 날짜(Seoul) 목록
    const { data: reads, error: e1 } = await state.client
      .from("talent_transactions")
      .select("created_at")
      .eq("student_id", studentId)
      .eq("reason", DAILY_BIBLE_REASON)
      .order("created_at", { ascending: true })
      .limit(2000);
    if (e1) return { error: e1 };
    const dayKeys = Array.from(new Set((reads || []).map((r) => seoulDayKey(r.created_at)))).sort();
    if (!dayKeys.length) return { added: 0, sum: 0 };

    // 2) 이미 지급된 보너스 날짜(Seoul)
    const { data: bons, error: e2 } = await state.client
      .from("talent_transactions")
      .select("created_at")
      .eq("student_id", studentId)
      .eq("reason", BONUS_REASON)
      .limit(2000);
    if (e2) return { error: e2 };
    const bonusDays = new Set((bons || []).map((r) => seoulDayKey(r.created_at)));

    // 3) 연속 구간별로 마일스톤 보너스 산출 (누락분만)
    const toInsert = [];
    let runStart = 0;
    for (let i = 0; i < dayKeys.length; i++) {
      const isRunEnd = i === dayKeys.length - 1 || addDays(dayKeys[i], 1) !== dayKeys[i + 1];
      if (isRunEnd) {
        for (let j = runStart; j <= i; j++) {
          const pos = j - runStart + 1;
          const amt = bonusForStreak(pos);
          if (amt > 0 && !bonusDays.has(dayKeys[j])) {
            toInsert.push({ day: dayKeys[j], amt, pos });
          }
        }
        runStart = i + 1;
      }
    }
    if (!toInsert.length) return { added: 0, sum: 0 };

    // 4) 삽입 (추가만)
    const rows = toInsert.map((x) => ({
      student_id: studentId,
      teacher_id: state.session.user.id,
      amount: x.amt,
      reason: BONUS_REASON,
      memo: `${x.pos}일 연속 보너스`,
      created_at: kstNoonIso(x.day)
    }));
    const { error: e3 } = await state.client.from("talent_transactions").insert(rows);
    if (e3) return { error: e3 };
    return { added: toInsert.length, sum: toInsert.reduce((s, x) => s + x.amt, 0) };
  }

  // 다른 패치(날짜수정)에서도 호출할 수 있도록 노출
  window.__recomputeDailyBibleBonus = recompute;

  // 지급 성공 후 자동 재계산
  if (typeof awardTalent === "function") {
    const inner = awardTalent;
    awardTalent = async function bonusAwardTalent(payload) {
      const ok = await inner(payload);
      if (!ok) return ok;
      if (!payload || payload.reason !== DAILY_BIBLE_REASON) return ok;
      const student = getStudent(payload.studentId);
      if (!student) return ok;

      const res = await recompute(student.id);
      if (res.error) { setMessage(res.error.message); return ok; }
      if (res.added > 0) {
        await loadRemoteData();
        state.selectedStudentId = student.id;
        setMessage(`🎉 ${student.name} 연속 보너스 +${res.sum} 달란트가 지급되었습니다.`);
      }
      return ok;
    };
  }
})();
