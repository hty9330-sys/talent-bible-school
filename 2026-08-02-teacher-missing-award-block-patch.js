(() => {
  if (typeof state === "undefined") return;

  const MISSING_REASON = "\uB204\uB77D";
  const TEACHER_MISSING_MESSAGE = "\uB204\uB77D \uAE30\uB85D\uC740 \uAD00\uB9AC\uC790\uB9CC \uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";

  function isTeacherMissingBlocked(reason) {
    return reason === MISSING_REASON
      && typeof isStaff === "function"
      && isStaff()
      && !(typeof isAdmin === "function" && isAdmin());
  }

  function blockTeacherMissing(reason) {
    if (!isTeacherMissingBlocked(reason)) return false;
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
    const reasonSelect = form.querySelector("select[name='reason']");
    if (!reasonSelect) return;

    Array.from(reasonSelect.options).forEach((option) => {
      if (option.value !== MISSING_REASON) return;
      option.disabled = true;
      option.hidden = true;
    });

    if (reasonSelect.value === MISSING_REASON) chooseFallbackReason(reasonSelect);

    let notice = form.querySelector("[data-teacher-missing-award-notice]");
    if (!notice) {
      notice = document.createElement("p");
      notice.className = "empty";
      notice.dataset.teacherMissingAwardNotice = "true";
      reasonSelect.closest("label")?.insertAdjacentElement("afterend", notice);
    }
    notice.textContent = TEACHER_MISSING_MESSAGE;
  }

  if (typeof awardTalent === "function") {
    const innerAwardTalent = awardTalent;
    awardTalent = async function teacherMissingAwardTalent(payload) {
      if (blockTeacherMissing(payload?.reason)) return false;
      return innerAwardTalent(payload);
    };
  }

  if (typeof updateTalentTransaction === "function") {
    const innerUpdateTalentTransaction = updateTalentTransaction;
    updateTalentTransaction = async function teacherMissingUpdateTalentTransaction(payload) {
      if (blockTeacherMissing(payload?.reason)) return false;
      return innerUpdateTalentTransaction(payload);
    };
  }

  if (typeof bindEvents === "function") {
    const innerBindEvents = bindEvents;
    bindEvents = function teacherMissingBindEvents(root) {
      innerBindEvents(root);
      applyTeacherMissingGuard(root);
      const reasonSelect = root.querySelector("#award-form select[name='reason']");
      reasonSelect?.addEventListener("change", () => {
        if (blockTeacherMissing(reasonSelect.value)) {
          chooseFallbackReason(reasonSelect);
          render();
        }
      });
    };
  }
})();
