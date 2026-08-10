(function () {
  function getEls() {
    return {
      modal: document.getElementById("studentIdModal"),
      input: document.getElementById("studentIdInput"),
      error: document.getElementById("studentIdModalError"),
      confirm: document.getElementById("studentIdModalConfirm"),
    };
  }

  const CONFIRM_LABEL = "Save & finish";

  function setError(msg) {
    const { error } = getEls();
    if (!error) return;
    if (!msg) {
      error.hidden = true;
      error.textContent = "";
      return;
    }
    error.hidden = false;
    error.textContent = msg;
  }

  function setConfirmLoading(loading) {
    const { confirm, input } = getEls();
    if (confirm) {
      confirm.disabled = loading;
      confirm.classList.toggle("is-loading", loading);
      confirm.setAttribute("aria-busy", loading ? "true" : "false");
      confirm.innerHTML = loading
        ? '<span class="student-id-modal__spinner" aria-hidden="true"></span><span>Saving...</span>'
        : CONFIRM_LABEL;
    }
    if (input) input.disabled = loading;
    document.querySelectorAll("[data-student-modal-close]").forEach(function (el) {
      if (el.tagName === "BUTTON" || el.classList.contains("student-id-modal__btn")) {
        el.disabled = !!loading;
      }
    });
  }

  function closeModal() {
    const { modal, input } = getEls();
    setConfirmLoading(false);
    if (modal) modal.hidden = true;
    document.body.classList.remove("student-id-modal-open");
    if (input) {
      input.disabled = false;
      input.blur();
    }
  }

  function openModal() {
    const { modal, input } = getEls();
    if (!modal) return;
    setError("");
    setConfirmLoading(false);
    modal.hidden = false;
    document.body.classList.add("student-id-modal-open");
    requestAnimationFrame(function () {
      if (input) {
        input.disabled = false;
        input.focus();
        input.select();
      }
    });
  }

  /**
   * Opens student ID modal, then runs `task(studentId)` while showing loading.
   * Resolves with task result, or null if cancelled.
   */
  window.runWithStudentIdModal = function runWithStudentIdModal(task) {
    return new Promise(function (resolve) {
      const { modal, input, confirm } = getEls();
      if (!modal || !input || !confirm) {
        resolve(null);
        return;
      }

      let busy = false;

      function cleanup() {
        modal.removeEventListener("click", onClick);
        confirm.removeEventListener("click", onConfirm);
        input.removeEventListener("keydown", onKey);
        document.removeEventListener("keydown", onEsc);
      }

      function cancel() {
        if (busy) return;
        cleanup();
        closeModal();
        resolve(null);
      }

      async function onConfirm() {
        if (busy) return;
        const id = String(input.value || "").trim().replace(/\D/g, "");
        if (!id) {
          setError("Please enter your student ID");
          input.focus();
          return;
        }
        if (id.length !== 5) {
          setError("Student ID must be 5 digits");
          input.focus();
          return;
        }
        input.value = id;

        busy = true;
        setError("");
        setConfirmLoading(true);

        try {
          const result = await task(id);
          cleanup();
          alert("บันทึกการ์ดเรียบร้อยแล้ว!");
          closeModal();
          resolve(result == null ? { studentId: id } : result);
        } catch (err) {
          console.error(err);
          const msg = (err && err.message) || "Could not save postcard";
          setError(msg);
          alert(msg);
          busy = false;
          setConfirmLoading(false);
        }
      }

      function onClick(e) {
        if (e.target.closest("[data-student-modal-close]")) cancel();
      }

      function onKey(e) {
        if (e.key === "Enter") {
          e.preventDefault();
          onConfirm();
        }
      }

      function onEsc(e) {
        if (e.key === "Escape") cancel();
      }

      modal.addEventListener("click", onClick);
      confirm.addEventListener("click", onConfirm);
      input.addEventListener("keydown", onKey);
      document.addEventListener("keydown", onEsc);
      openModal();
    });
  };

  // Back-compat alias
  window.askStudentId = function askStudentId() {
    return window.runWithStudentIdModal(function (id) {
      return id;
    });
  };
})();
