(() => {
  if (typeof state === "undefined") return;

  const DAILY_BIBLE_REASON = "매일성경읽기";
  const DAILY_BIBLE_BONUS_REASON = "매일성경읽기 보너스";
  const BIBLE_LEARNING_REASON = "성경학습";
  const allowedGuardianTeacherReasons = new Set([
    DAILY_BIBLE_REASON,
    DAILY_BIBLE_BONUS_REASON,
    BIBLE_LEARNING_REASON
  ]);

  function isGuardianTeacherRestrictedCached(studentId) {
    if (!studentId || typeof isAdmin !== "function" || isAdmin()) return false;
    if (!(typeof isStaff === "function" && isStaff())) return false;
    const userId = state.session?.user?.id;
    if (!userId) return false;
    return (state.guardianTeacherLinks || state.guardianLinks || []).some((link) => (
      link.student_id === studentId && link.guardian_id === userId
    ));
  }

  async function isGuardianTeacherRestricted(studentId) {
    if (isGuardianTeacherRestrictedCached(studentId)) return true;
    if (!studentId || !state.client || !state.session) return false;
    if (typeof isAdmin === "function" && isAdmin()) return false;
    if (!(typeof isStaff === "function" && isStaff())) return false;

    const { data, error } = await state.client
      .from("student_guardians")
      .select("student_id,guardian_id")
      .eq("student_id", studentId)
      .eq("guardian_id", state.session.user.id)
      .limit(1);
    if (error) {
      setMessage(error.message);
      return true;
    }
    const restricted = Boolean(data && data.length);
    if (restricted) {
      state.guardianTeacherLinks = state.guardianTeacherLinks || [];
      if (!state.guardianTeacherLinks.some((link) => link.student_id === studentId && link.guardian_id === state.session.user.id)) {
        state.guardianTeacherLinks.push({ student_id: studentId, guardian_id: state.session.user.id });
      }
    }
    return restricted;
  }

  function isAllowedGuardianTeacherTalentPayload(payload) {
    if (!payload) return true;
    if (payload.reason === DAILY_BIBLE_REASON) return true;
    if (payload.reason === DAILY_BIBLE_BONUS_REASON) return true;
    return payload.reason === BIBLE_LEARNING_REASON && Number(payload.amount) === 2;
  }

  async function canSaveGuardianTeacherTalent(payload) {
    const restricted = await isGuardianTeacherRestricted(payload?.studentId);
    return !restricted || isAllowedGuardianTeacherTalentPayload(payload);
  }

  function guardianTeacherMessage(studentName) {
    return `${studentName || "이 아이"}는 선생님 본인이 보호자로 연결되어 있어 매일성경읽기, 매일성경읽기 보너스, 성경학습 2달란트만 기록할 수 있습니다.`;
  }

  async function loadGuardianTeacherLinks() {
    if (!state.client || !state.session || typeof isAdmin !== "function" || isAdmin()) {
      state.guardianTeacherLinks = [];
      return;
    }
    if (!(typeof isStaff === "function" && isStaff())) {
      state.guardianTeacherLinks = [];
      return;
    }
    const { data, error } = await state.client
      .from("student_guardians")
      .select("student_id,guardian_id")
      .eq("guardian_id", state.session.user.id);
    if (!error) state.guardianTeacherLinks = data || [];
  }

  if (typeof clearRemoteState === "function") {
    const innerClearRemoteState = clearRemoteState;
    clearRemoteState = function guardianTeacherClearRemoteState() {
      innerClearRemoteState();
      state.guardianTeacherLinks = [];
    };
  }

  if (typeof loadRemoteData === "function") {
    const innerLoadRemoteData = loadRemoteData;
    loadRemoteData = async function guardianTeacherLoadRemoteData() {
      await innerLoadRemoteData();
      await loadGuardianTeacherLinks();
    };
  }

  if (typeof awardTalent === "function") {
    const innerAwardTalent = awardTalent;
    awardTalent = async function guardianTeacherAwardTalent(payload) {
      if (!(await canSaveGuardianTeacherTalent(payload))) {
        const student = typeof getStudent === "function" ? getStudent(payload.studentId) : null;
        setMessage(guardianTeacherMessage(student?.name));
        return false;
      }
      return innerAwardTalent(payload);
    };
  }

  if (typeof updateTalentTransaction === "function") {
    const innerUpdateTalentTransaction = updateTalentTransaction;
    updateTalentTransaction = async function guardianTeacherUpdateTalentTransaction(payload) {
      if (!(await canSaveGuardianTeacherTalent(payload))) {
        const student = typeof getStudent === "function" ? getStudent(payload.studentId) : null;
        setMessage(guardianTeacherMessage(student?.name));
        return false;
      }
      return innerUpdateTalentTransaction(payload);
    };
  }

  function applyAwardFormGuard(root) {
    const form = root.querySelector("#award-form");
    if (!form) return;
    const studentSelect = form.querySelector("select[name='studentId']");
    const reasonSelect = form.querySelector("select[name='reason']");
    const submitButton = form.querySelector("button[type='submit']");
    if (!studentSelect || !reasonSelect || !submitButton) return;

    const studentId = studentSelect.value;
    const restricted = isGuardianTeacherRestrictedCached(studentId);
    let notice = form.querySelector("[data-guardian-teacher-award-notice]");
    if (!notice) {
      notice = document.createElement("p");
      notice.className = "empty";
      notice.dataset.guardianTeacherAwardNotice = "true";
      reasonSelect.closest("label")?.insertAdjacentElement("afterend", notice);
    }

    Array.from(reasonSelect.options).forEach((option) => {
      option.disabled = restricted && !allowedGuardianTeacherReasons.has(option.value);
    });

    if (restricted && !allowedGuardianTeacherReasons.has(reasonSelect.value)) {
      reasonSelect.value = DAILY_BIBLE_REASON;
      state.reason = DAILY_BIBLE_REASON;
    }

    const student = typeof getStudent === "function" ? getStudent(studentId) : null;
    notice.hidden = !restricted;
    notice.textContent = restricted ? guardianTeacherMessage(student?.name) : "";
  }

  if (typeof bindEvents === "function") {
    const innerBindEvents = bindEvents;
    bindEvents = function guardianTeacherBindEvents(root) {
      innerBindEvents(root);
      applyAwardFormGuard(root);
      const form = root.querySelector("#award-form");
      if (!form) return;
      form.querySelector("select[name='studentId']")?.addEventListener("change", () => applyAwardFormGuard(root));
      form.querySelector("select[name='reason']")?.addEventListener("change", () => applyAwardFormGuard(root));
    };
  }
})();