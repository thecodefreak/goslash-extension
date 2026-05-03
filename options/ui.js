import { MODE_GROUP, MODE_SHORTCUT, TOAST_ICONS, el, state, clearGroupEditState, clearShortcutInputs } from "./state.js";

export function confirmAction({ title = "Are you sure?", message = "", confirmLabel = "Delete", danger = true } = {}) {
  return new Promise((resolve) => {
    el.confirmTitle.textContent = title;
    el.confirmMessage.textContent = message;
    el.confirmConfirmBtn.textContent = confirmLabel;
    el.confirmConfirmBtn.classList.toggle("danger", danger);

    let result = false;
    const onConfirm = () => { result = true; el.confirmDialog.close(); };
    const onCancel = () => { el.confirmDialog.close(); };
    const onClose = () => {
      el.confirmConfirmBtn.removeEventListener("click", onConfirm);
      el.confirmCancelBtn.removeEventListener("click", onCancel);
      resolve(result);
    };

    el.confirmConfirmBtn.addEventListener("click", onConfirm);
    el.confirmCancelBtn.addEventListener("click", onCancel);
    el.confirmDialog.addEventListener("close", onClose, { once: true });
    el.confirmDialog.showModal();
    el.confirmCancelBtn.focus();
  });
}

export function updateBulkActions() {
  const count = state.selected.size;
  el.bulkActions.classList.toggle("is-visible", count > 0);
  el.bulkCount.textContent = String(count);
}

export function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icon = document.createElement("span");
  icon.className = "toast-icon";
  icon.innerHTML = TOAST_ICONS[type] || TOAST_ICONS.info;

  const text = document.createElement("span");
  text.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(text);
  el.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => {
      toast.remove();
    });
  }, 3000);
}

export function getSelectedMode() {
  return state.currentMode;
}

export function setSelectedMode(mode) {
  state.currentMode = mode === MODE_GROUP ? MODE_GROUP : MODE_SHORTCUT;
  el.modeTabs.forEach((tab) => {
    const isSelected = tab.dataset.mode === state.currentMode;
    tab.setAttribute("aria-selected", isSelected ? "true" : "false");
    tab.tabIndex = isSelected ? 0 : -1;
  });
  updateModeUI();
}

export function updateModeUI() {
  const isGroupMode = getSelectedMode() === MODE_GROUP;

  el.shortcutFields.hidden = isGroupMode;
  el.groupFields.hidden = !isGroupMode;
  el.shortcutFields.setAttribute("aria-hidden", isGroupMode ? "true" : "false");
  el.groupFields.setAttribute("aria-hidden", isGroupMode ? "false" : "true");
  el.cancelBtn.hidden = isGroupMode || state.currentEditIndex === null;
  el.groupCancelBtn.hidden = !isGroupMode || state.currentGroupEditName === null;

  if (isGroupMode) {
    el.saveBtn.textContent = state.currentGroupEditName ? "Update group" : "Save group";
  } else if (state.currentEditIndex !== null) {
    el.saveBtn.textContent = "Update shortcut";
  } else {
    el.saveBtn.textContent = "Save shortcut";
  }
}

export function syncGroupFilter(groups) {
  const prev = el.groupFilter.value;
  el.groupFilter.innerHTML = '<option value="">All groups</option>';
  groups.forEach((group) => {
    const opt = document.createElement("option");
    opt.value = group;
    opt.textContent = group;
    el.groupFilter.appendChild(opt);
  });
  if (prev && groups.includes(prev)) {
    el.groupFilter.value = prev;
  }
}

export function syncGroupOptions(groups) {
  const previousValue = el.shortcutGroup.value;
  el.shortcutGroup.innerHTML = "";

  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = "No group (normal shortcut)";
  el.shortcutGroup.appendChild(noneOption);

  groups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = group;
    el.shortcutGroup.appendChild(option);
  });

  if (previousValue && groups.includes(previousValue)) {
    el.shortcutGroup.value = previousValue;
  } else {
    el.shortcutGroup.value = "";
  }
}

export function resetForm(options = {}) {
  const { mode = MODE_SHORTCUT } = options;
  el.form.reset();
  state.currentEditIndex = null;
  clearGroupEditState({ clearInput: true });
  clearShortcutInputs();
  setSelectedMode(mode);
}

export function activateMode(mode, options = {}) {
  const { fromKeyboard = false } = options;
  const nextMode = mode === MODE_GROUP ? MODE_GROUP : MODE_SHORTCUT;
  if (nextMode === state.currentMode) return;

  if (nextMode === MODE_GROUP && state.currentEditIndex !== null) {
    state.currentEditIndex = null;
    showToast("Shortcut edit canceled.", "info");
  }

  if (nextMode === MODE_SHORTCUT && state.currentGroupEditName !== null) {
    clearGroupEditState({ clearInput: true });
  }

  setSelectedMode(nextMode);
  if (fromKeyboard) {
    const activeTab = el.modeTabs.find((tab) => tab.dataset.mode === nextMode);
    activeTab?.focus();
  }
}
