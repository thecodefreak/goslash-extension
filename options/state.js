export const MODE_SHORTCUT = "shortcut";
export const MODE_GROUP = "group";

export const el = {
  form: document.getElementById("shortcut-form"),
  modeTabs: Array.from(document.querySelectorAll(".mode-tab[data-mode]")),
  shortcutFields: document.getElementById("shortcut-fields"),
  groupFields: document.getElementById("group-fields"),
  shortcutGroup: document.getElementById("shortcut-group"),
  groupName: document.getElementById("group-name"),
  groupsList: document.getElementById("groups-list"),
  keyword: document.getElementById("keyword"),
  url: document.getElementById("url"),
  title: document.getElementById("title"),
  saveBtn: document.getElementById("save-btn"),
  cancelBtn: document.getElementById("cancel-btn"),
  groupCancelBtn: document.getElementById("group-cancel-btn"),
  list: document.getElementById("shortcuts-list"),
  importFile: document.getElementById("import-file"),
  importBtn: document.getElementById("import-btn"),
  exportBtn: document.getElementById("export-btn"),
  resetBtn: document.getElementById("reset-btn"),
  searchInput: document.getElementById("search-input"),
  showUsage: document.getElementById("show-usage"),
  usageHeader: document.getElementById("usage-header"),
  toastContainer: document.getElementById("toast-container")
};

export const state = {
  currentEditIndex: null,
  currentGroupEditName: null,
  currentMode: MODE_SHORTCUT,
  showUsageStats: false,
  sortByUsage: false,
  sortDescending: true
};

export const TOAST_ICONS = {
  success: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
  error: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`,
  info: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`
};

export const ACTION_ICONS = {
  edit: `<svg class="ui-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4.75 14.5v.75h.75l7.97-7.97-.75-.75L4.75 14.5Zm9.53-9.53.75.75.47-.47a1.06 1.06 0 0 0-1.5-1.5l-.47.47Z" fill="currentColor"/></svg>`,
  delete: `<svg class="ui-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M6.25 6.25h7.5M8 6.25V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.25m-4.25 0-.5 8a1 1 0 0 0 1 .99h3.5a1 1 0 0 0 1-.99l-.5-8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};

export function clearGroupEditState(options = {}) {
  const { clearInput = false } = options;
  state.currentGroupEditName = null;
  if (clearInput) {
    el.groupName.value = "";
  }
}

export function clearShortcutInputs() {
  el.shortcutGroup.value = "";
  el.keyword.value = "";
  el.url.value = "";
  el.title.value = "";
}

export function getGroupsFromShortcuts(list) {
  return [...new Set(list.map((entry) => getShortcutGroup(entry)).filter(Boolean))];
}

export function mergeGroups(...groupsLists) {
  return [...new Set(groupsLists.flat().map((group) => normalizeSegment(group)).filter(Boolean))].sort();
}
