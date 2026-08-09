(() => {
  if (typeof state === "undefined") return;

  const MISSING_REASON = "\uB204\uB77D";
  const TEACHER_MISSING_MESSAGE = "\uB204\uB77D \uAE30\uB85D\uC740 \uBCF4\uD638\uC790\uB85C \uC5F0\uACB0\uB41C \uC544\uC774\uC5D0\uAC8C\uB9CC \uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";

  function shouldCheckTeacherMissing(reason) {
    return reason === MISSING_REASON
      && typeof isStaff === "function"
      && isStaff()
      && !(typeof isAdmin === "function" && isAdmin());
  }

  function isGuardianLinkedStudentCached(studentId) {
    if (!studentId || !state.session?.user?.id) return false;
    const links = state.guardianTeacherLinks || state.guardianLinks || [];
    return links.some((link) => (
      link.student_id === studentId && link.guardian_id === state.session.user.id
    ));
  }

  async function isGuardianLinkedStudent(studentId) {
    if (isGuardianLinkedStudentCached(studentId)) return true;
    if (!studentId || !state.client || !state.session?.user?.id) return false;

    const { data, error } = await state.client
      .from("student_guardians")
      .select("student_id,guardian_id")
      .eq("student_id", studentId)
      .eq("guardian_id", state.session.user.id)
      .limit(1);
    if (error) {
      if (typeof setMessage === "function") setMessage(error.message);
      return false;
    }
    const linked = Boolean(data && data.length);
    if (linked) {
      state.guardianTeacherLinks = state.guardianTeacherLinks || [];
      if (!state.guardianTeacherLinks.some((link) => link.student_id === studentId && link.guardian_id === state.session.user.id)) {
        state.guardianTeacherLinks.push({ student_id: studentId, guardian_id: state.session.user.id });
      }
    }
    return linked;
  }

  async function blockTeacherMissing(payload) {
    if (!shouldCheckTeacherMissing(payload?.reason)) return false;
    if (await isGuardianLinkedStudent(payload?.studentId)) return false;
    if (typeof setMessage === "function") setMessage(TEACHER_MISSING_MESSAGE);
    return true;
  }

  function chooseFallbackReason(reasonSelect) {
    const option = Array.from(reasonSelect.options).find((item) => item.value !== MISSING_REASON);
    if (!option) return;
    reasonSelect.value = option.value;
    state.reason = option.value;
  }

  function applyTeacherMissingGuard(root) {
    if (!(typeof isStaff === "function" && isStaff()) || (typeof isAdmin === "function" && isAdmin())) return;
    const form = root.querySelector("#award-form");
    if (!form) return;
    const studentSelect = form.querySelector("select[name='studentId']");
    const reasonSelect = form.querySelector("select[name='reason']");
    if (!reasonSelect) return;
    const canUseMissing = isGuardianLinkedStudentCached(studentSelect?.value);

    Array.from(reasonSelect.options).forEach((option) => {
      if (option.value !== MISSING_REASON) return;
      option.disabled = !canUseMissing;
      option.hidden = !canUseMissing;
    });

    if (!canUseMissing && reasonSelect.value === MISSING_REASON) chooseFallbackReason(reasonSelect);

    let notice = form.querySelector("[data-teacher-missing-award-notice]");
    if (!notice) {
      notice = document.createElement("p");
      notice.className = "empty";
      notice.dataset.teacherMissingAwardNotice = "true";
      reasonSelect.closest("label")?.insertAdjacentElement("afterend", notice);
    }
    notice.hidden = canUseMissing;
    notice.textContent = TEACHER_MISSING_MESSAGE;
  }

  if (typeof awardTalent === "function") {
    const innerAwardTalent = awardTalent;
    awardTalent = async function teacherMissingAwardTalent(payload) {
      if (await blockTeacherMissing(payload)) return false;
      return innerAwardTalent(payload);
    };
  }

  if (typeof updateTalentTransaction === "function") {
    const innerUpdateTalentTransaction = updateTalentTransaction;
    updateTalentTransaction = async function teacherMissingUpdateTalentTransaction(payload) {
      if (await blockTeacherMissing(payload)) return false;
      return innerUpdateTalentTransaction(payload);
    };
  }

  if (typeof bindEvents === "function") {
    const innerBindEvents = bindEvents;
    bindEvents = function teacherMissingBindEvents(root) {
      innerBindEvents(root);
      applyTeacherMissingGuard(root);
      root.querySelector("#award-form select[name='studentId']")?.addEventListener("change", async () => {
        const studentId = root.querySelector("#award-form select[name='studentId']")?.value;
        await isGuardianLinkedStudent(studentId);
        applyTeacherMissingGuard(root);
      });
      const reasonSelect = root.querySelector("#award-form select[name='reason']");
      reasonSelect?.addEventListener("change", async () => {
        const studentId = root.querySelector("#award-form select[name='studentId']")?.value;
        if (await blockTeacherMissing({ studentId, reason: reasonSelect.value })) {
          chooseFallbackReason(reasonSelect);
          render();
        }
      });
    };
  }
})();
