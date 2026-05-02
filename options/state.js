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
  groupFilter: document.getElementById("group-filter"),
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
  sortDescending: true,
  collapsedGroups: new Set()
};

export const TOAST_ICONS = {
  success: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
  error: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`,
  info: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`
};

export const ACTION_ICONS = {
  edit: `<svg class="ui-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false"><path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.919 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z"/><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z"/></svg>`,
  delete: `<svg class="ui-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482 41.03 41.03 0 0 0-2.595-.34V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd"/></svg>`
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
