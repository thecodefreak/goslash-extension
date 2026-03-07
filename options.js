// shared.js must be loaded before this file

const MODE_SHORTCUT = "shortcut";
const MODE_GROUP = "group";

const elements = {
  form: document.getElementById("shortcut-form"),
  modeTabs: Array.from(document.querySelectorAll(".mode-tab[data-mode]")),
  shortcutFields: document.getElementById("shortcut-fields"),
  groupFields: document.getElementById("group-fields"),
  shortcutGroup: document.getElementById("shortcut-group"),
  groupName: document.getElementById("group-name"),
  keyword: document.getElementById("keyword"),
  url: document.getElementById("url"),
  title: document.getElementById("title"),
  saveBtn: document.getElementById("save-btn"),
  cancelBtn: document.getElementById("cancel-btn"),
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

let currentEditIndex = null;
let currentMode = MODE_SHORTCUT;
let showUsageStats = false;
let sortByUsage = false;
let sortDescending = true;

const TOAST_ICONS = {
  success: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
  error: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`,
  info: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`
};

const ACTION_ICONS = {
  edit: `<svg class="ui-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4.75 14.5v.75h.75l7.97-7.97-.75-.75L4.75 14.5Zm9.53-9.53.75.75.47-.47a1.06 1.06 0 0 0-1.5-1.5l-.47.47Z" fill="currentColor"/></svg>`,
  delete: `<svg class="ui-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M6.25 6.25h7.5M8 6.25V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.25m-4.25 0-.5 8a1 1 0 0 0 1 .99h3.5a1 1 0 0 0 1-.99l-.5-8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icon = document.createElement("span");
  icon.className = "toast-icon";
  icon.innerHTML = TOAST_ICONS[type] || TOAST_ICONS.info;

  const text = document.createElement("span");
  text.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(text);
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => {
      toast.remove();
    });
  }, 3000);
}

function getSelectedMode() {
  return currentMode;
}

function setSelectedMode(mode) {
  currentMode = mode === MODE_GROUP ? MODE_GROUP : MODE_SHORTCUT;
  elements.modeTabs.forEach((tab) => {
    const isSelected = tab.dataset.mode === currentMode;
    tab.setAttribute("aria-selected", isSelected ? "true" : "false");
    tab.tabIndex = isSelected ? 0 : -1;
  });
  updateModeUI();
}

function getGroupsFromShortcuts(list) {
  return [...new Set(list.map((entry) => getShortcutGroup(entry)).filter(Boolean))];
}

function mergeGroups(...groupsLists) {
  return [...new Set(groupsLists.flat().map((group) => normalizeSegment(group)).filter(Boolean))].sort();
}

function updateModeUI() {
  const mode = getSelectedMode();
  const isGroupMode = mode === MODE_GROUP;

  elements.shortcutFields.hidden = isGroupMode;
  elements.groupFields.hidden = !isGroupMode;
  elements.shortcutFields.setAttribute("aria-hidden", isGroupMode ? "true" : "false");
  elements.groupFields.setAttribute("aria-hidden", isGroupMode ? "false" : "true");
  elements.cancelBtn.hidden = isGroupMode || currentEditIndex === null;

  if (isGroupMode) {
    elements.saveBtn.textContent = "Save group";
  } else if (currentEditIndex !== null) {
    elements.saveBtn.textContent = "Update shortcut";
  } else {
    elements.saveBtn.textContent = "Save shortcut";
  }
}

function syncGroupOptions(groups) {
  const previousValue = elements.shortcutGroup.value;
  elements.shortcutGroup.innerHTML = "";

  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = "No group (normal shortcut)";
  elements.shortcutGroup.appendChild(noneOption);

  groups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = group;
    elements.shortcutGroup.appendChild(option);
  });

  if (previousValue && groups.includes(previousValue)) {
    elements.shortcutGroup.value = previousValue;
  } else {
    elements.shortcutGroup.value = "";
  }
}

function clearShortcutInputs() {
  elements.shortcutGroup.value = "";
  elements.keyword.value = "";
  elements.url.value = "";
  elements.title.value = "";
}

function resetForm(options = {}) {
  const { mode = MODE_SHORTCUT } = options;

  elements.form.reset();
  currentEditIndex = null;
  elements.groupName.value = "";
  clearShortcutInputs();
  setSelectedMode(mode);
}

function normalizeEntry(entry) {
  let group = normalizeSegment(entry.group || "");
  let keyword = normalizeSegment(entry.keyword || "");
  const url = (entry.url || "").trim();
  const title = (entry.title || "").trim();

  // Import compatibility: allow { keyword: "group/keyword" } when group is omitted.
  if (!group && keyword.includes("/")) {
    const parts = keyword.split("/").filter(Boolean);
    if (parts.length === 2) {
      [group, keyword] = parts;
    }
  }

  if (group && !KEYWORD_PATTERN.test(group)) return null;
  if (!keyword || !KEYWORD_PATTERN.test(keyword)) return null;
  if (!url) return null;

  const normalized = {
    keyword,
    url: ensureScheme(url),
    title: title || ""
  };

  if (group) {
    normalized.group = group;
  }

  return normalized;
}

function getUsageCount(usageStats, entry) {
  const usageKey = getShortcutKey(entry);
  if (Object.prototype.hasOwnProperty.call(usageStats, usageKey)) {
    return usageStats[usageKey];
  }

  // Legacy fallback: old records were keyed only by keyword.
  if (!getShortcutGroup(entry) && Object.prototype.hasOwnProperty.call(usageStats, entry.keyword)) {
    return usageStats[entry.keyword];
  }

  return 0;
}

function updateSortArrow() {
  if (!showUsageStats) return;
  const arrow = sortByUsage ? (sortDescending ? " \u25BC" : " \u25B2") : "";
  elements.usageHeader.textContent = "Usage" + arrow;
}

function render(list, usageStats = {}, filterText = "") {
  elements.list.innerHTML = "";

  let filtered = list.map((entry, index) => ({ entry, index }));
  if (filterText) {
    const lower = filterText.toLowerCase();
    filtered = filtered.filter(({ entry }) =>
      getShortcutKey(entry).includes(lower) ||
      entry.url.toLowerCase().includes(lower) ||
      (entry.title || "").toLowerCase().includes(lower)
    );
  }

  if (showUsageStats && sortByUsage) {
    filtered.sort((a, b) => {
      const aUsage = getUsageCount(usageStats, a.entry);
      const bUsage = getUsageCount(usageStats, b.entry);
      return sortDescending ? bUsage - aUsage : aUsage - bUsage;
    });
  }

  updateSortArrow();

  if (!filtered.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = showUsageStats ? 5 : 4;
    cell.textContent = filterText
      ? "No shortcuts match your filter."
      : "No shortcuts yet. Add one above.";
    row.appendChild(cell);
    elements.list.appendChild(row);
    return;
  }

  filtered.forEach(({ entry, index }) => {
    const row = document.createElement("tr");
    row.dataset.index = String(index);

    const shortcutCell = document.createElement("td");
    shortcutCell.textContent = getShortcutKey(entry);

    const urlCell = document.createElement("td");
    const urlCode = document.createElement("code");
    urlCode.textContent = entry.url;
    urlCell.appendChild(urlCode);

    const titleCell = document.createElement("td");
    titleCell.textContent = entry.title || "-";

    const actionsCell = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "ghost icon-label";
    editBtn.innerHTML = `${ACTION_ICONS.edit}<span>Edit</span>`;
    editBtn.addEventListener("click", () => startEdit(index, entry));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "danger icon-label";
    deleteBtn.innerHTML = `${ACTION_ICONS.delete}<span>Delete</span>`;
    deleteBtn.addEventListener("click", () => removeShortcut(index));

    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(deleteBtn);
    actionsCell.style.display = "flex";
    actionsCell.style.gap = "8px";

    row.appendChild(shortcutCell);
    row.appendChild(urlCell);
    row.appendChild(titleCell);

    if (showUsageStats) {
      const usageCell = document.createElement("td");
      usageCell.className = "usage-cell usage-col";
      const count = getUsageCount(usageStats, entry);
      usageCell.textContent = count === 1 ? "1 use" : `${count} uses`;
      row.appendChild(usageCell);
    }

    row.appendChild(actionsCell);
    elements.list.appendChild(row);
  });
}

async function refreshList() {
  const [list, usageStats, savedGroups] = await Promise.all([
    getShortcuts(),
    getUsageStats(),
    getGroups()
  ]);

  const allGroups = mergeGroups(savedGroups, getGroupsFromShortcuts(list));
  syncGroupOptions(allGroups);

  const filterText = elements.searchInput.value.trim();
  render(list, usageStats, filterText);
}

function startEdit(index, entry) {
  currentEditIndex = index;
  setSelectedMode(MODE_SHORTCUT);
  elements.shortcutGroup.value = getShortcutGroup(entry);
  elements.keyword.value = entry.keyword;
  elements.url.value = entry.url;
  elements.title.value = entry.title || "";
  updateModeUI();
  showToast("Editing shortcut. Update fields and save.", "info");
}

async function removeShortcut(index) {
  const list = await getShortcuts();
  const entry = list[index];
  if (!entry) return;

  const usageKey = getShortcutKey(entry);
  list.splice(index, 1);
  await setShortcuts(list);
  await deleteUsage(usageKey);

  if (currentEditIndex === index) {
    resetForm();
  } else if (currentEditIndex !== null && currentEditIndex > index) {
    currentEditIndex -= 1;
  }

  showToast("Shortcut removed!");
  await refreshList();
}

async function saveGroup() {
  const group = normalizeSegment(elements.groupName.value);
  if (!group || !KEYWORD_PATTERN.test(group)) {
    showToast("Enter a valid group name.", "error");
    return;
  }

  const [savedGroups, shortcuts] = await Promise.all([getGroups(), getShortcuts()]);
  const allGroups = mergeGroups(savedGroups, getGroupsFromShortcuts(shortcuts));
  if (allGroups.includes(group)) {
    showToast("That group already exists.", "error");
    return;
  }

  await setGroups([...savedGroups, group]);
  elements.groupName.value = "";
  showToast("Group saved!");
  await refreshList();
}

async function saveShortcut() {
  const group = normalizeSegment(elements.shortcutGroup.value);
  const input = {
    group,
    keyword: elements.keyword.value,
    url: elements.url.value,
    title: elements.title.value
  };

  const normalized = normalizeEntry(input);
  if (!normalized) {
    showToast("Enter a valid shortcut keyword and URL.", "error");
    return;
  }

  const [list, savedGroups] = await Promise.all([getShortcuts(), getGroups()]);
  const normalizedKey = getShortcutKey(normalized);
  const duplicateIndex = list.findIndex((entry) => getShortcutKey(entry) === normalizedKey);
  if (duplicateIndex !== -1 && duplicateIndex !== currentEditIndex) {
    showToast("That shortcut already exists.", "error");
    return;
  }

  let previousKey = "";
  if (currentEditIndex !== null) {
    previousKey = getShortcutKey(list[currentEditIndex]);
    list[currentEditIndex] = normalized;
    showToast("Shortcut updated!");
  } else {
    list.push(normalized);
    showToast("Shortcut saved!");
  }

  await setShortcuts(list);

  if (previousKey && previousKey !== normalizedKey) {
    await deleteUsage(previousKey);
  }

  if (normalized.group && !savedGroups.includes(normalized.group)) {
    await setGroups([...savedGroups, normalized.group]);
  }

  resetForm();
  await refreshList();
}

async function upsertShortcut(event) {
  event.preventDefault();

  if (getSelectedMode() === MODE_GROUP) {
    await saveGroup();
    return;
  }

  await saveShortcut();
}

async function importShortcuts() {
  const file = elements.importFile.files[0];
  if (!file) {
    showToast("Choose a JSON file to import.", "error");
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const incoming = Array.isArray(parsed) ? parsed : parsed.shortcuts;
    if (!Array.isArray(incoming)) {
      showToast("Import failed: invalid JSON format.", "error");
      return;
    }

    const incomingGroups = Array.isArray(parsed?.groups) ? parsed.groups : [];
    const [list, savedGroups] = await Promise.all([getShortcuts(), getGroups()]);
    const existingKeys = new Set(list.map((entry) => getShortcutKey(entry)));
    const groups = new Set(mergeGroups(savedGroups, incomingGroups, getGroupsFromShortcuts(list)));
    let addedCount = 0;
    let skippedCount = 0;

    incoming.forEach((entry) => {
      const normalized = normalizeEntry(entry);
      if (!normalized) {
        skippedCount += 1;
        return;
      }

      const shortcutKey = getShortcutKey(normalized);
      if (existingKeys.has(shortcutKey)) {
        skippedCount += 1;
        return;
      }

      list.push(normalized);
      existingKeys.add(shortcutKey);
      if (normalized.group) {
        groups.add(normalized.group);
      }
      addedCount += 1;
    });

    await Promise.all([setShortcuts(list), setGroups([...groups])]);
    showToast(`Imported ${addedCount} shortcut(s), skipped ${skippedCount}.`);
    elements.importFile.value = "";
    await refreshList();
  } catch {
    showToast("Import failed: invalid JSON file.", "error");
  }
}

async function exportShortcuts() {
  const [list, groups] = await Promise.all([getShortcuts(), getGroups()]);
  const manifest = chrome.runtime.getManifest();
  const exportData = {
    name: manifest.name,
    version: manifest.version,
    exportedAt: new Date().toISOString(),
    groups,
    shortcuts: list
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "goslash-shortcuts.json";
  link.click();
  URL.revokeObjectURL(url);
  showToast(`Exported ${list.length} shortcut(s)!`);
}

async function resetShortcuts() {
  const confirmed = window.confirm("Reset to default shortcuts? This replaces your current list.");
  if (!confirmed) return;

  await Promise.all([setShortcuts(DEFAULT_SHORTCUTS), setGroups([])]);
  resetForm();
  showToast("Defaults restored!");
  await refreshList();
}

async function init() {
  let list = await getShortcuts();
  if (!list.length) {
    await setShortcuts(DEFAULT_SHORTCUTS);
    list = DEFAULT_SHORTCUTS;
  }

  const savedGroups = await getGroups();
  const mergedGroups = mergeGroups(savedGroups, getGroupsFromShortcuts(list));
  await setGroups(mergedGroups);

  await refreshList();
  resetForm();
}

// Event listeners
elements.form.addEventListener("submit", upsertShortcut);
elements.cancelBtn.addEventListener("click", () => {
  resetForm();
  showToast("Edit canceled.", "info");
});
elements.importBtn.addEventListener("click", importShortcuts);
elements.exportBtn.addEventListener("click", exportShortcuts);
elements.resetBtn.addEventListener("click", resetShortcuts);

function activateMode(mode, options = {}) {
  const { fromKeyboard = false } = options;
  const nextMode = mode === MODE_GROUP ? MODE_GROUP : MODE_SHORTCUT;
  if (nextMode === currentMode) return;

  if (nextMode === MODE_GROUP && currentEditIndex !== null) {
    currentEditIndex = null;
    showToast("Shortcut edit canceled.", "info");
  }

  setSelectedMode(nextMode);
  if (fromKeyboard) {
    const activeTab = elements.modeTabs.find((tab) => tab.dataset.mode === nextMode);
    activeTab?.focus();
  }
}

elements.modeTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => {
    activateMode(tab.dataset.mode);
  });

  tab.addEventListener("keydown", (event) => {
    const lastIndex = elements.modeTabs.length - 1;
    let targetIndex = -1;

    if (event.key === "ArrowRight") {
      targetIndex = index === lastIndex ? 0 : index + 1;
    } else if (event.key === "ArrowLeft") {
      targetIndex = index === 0 ? lastIndex : index - 1;
    } else if (event.key === "Home") {
      targetIndex = 0;
    } else if (event.key === "End") {
      targetIndex = lastIndex;
    } else if (event.key === "Enter" || event.key === " ") {
      activateMode(tab.dataset.mode, { fromKeyboard: true });
      event.preventDefault();
      return;
    }

    if (targetIndex !== -1) {
      const targetTab = elements.modeTabs[targetIndex];
      if (targetTab) {
        activateMode(targetTab.dataset.mode, { fromKeyboard: true });
      }
      event.preventDefault();
    }
  });
});

// Search filter
elements.searchInput.addEventListener("input", refreshList);

// Usage toggle
elements.showUsage.addEventListener("change", () => {
  showUsageStats = elements.showUsage.checked;
  elements.usageHeader.hidden = !showUsageStats;
  if (!showUsageStats) {
    sortByUsage = false;
  }
  refreshList();
});

// Sort by usage
elements.usageHeader.addEventListener("click", () => {
  if (sortByUsage) {
    sortDescending = !sortDescending;
  } else {
    sortByUsage = true;
    sortDescending = true;
  }
  refreshList();
});

init();
