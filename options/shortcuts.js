import { ACTION_ICONS, el, state, getGroupsFromShortcuts, mergeGroups } from "./state.js";
import { resetForm, setSelectedMode, showToast, updateModeUI } from "./ui.js";

let refreshList = async () => {};

export function setShortcutRefreshHandler(handler) {
  refreshList = handler;
}


export function getUsageCount(usageStats, entry) {
  const usageKey = getShortcutKey(entry);
  if (Object.prototype.hasOwnProperty.call(usageStats, usageKey)) {
    return usageStats[usageKey];
  }

  if (!getShortcutGroup(entry) && Object.prototype.hasOwnProperty.call(usageStats, entry.keyword)) {
    return usageStats[entry.keyword];
  }

  return 0;
}

function updateSortArrow() {
  const arrow = state.sortByUsage ? (state.sortDescending ? " \u25BC" : " \u25B2") : "";
  el.usageHeader.textContent = "Usage" + arrow;
}

export function renderShortcuts(list, usageStats = {}, filterText = "") {
  el.list.innerHTML = "";

  let filtered = list.map((entry, index) => ({ entry, index }));
  if (filterText) {
    const lower = filterText.toLowerCase();
    filtered = filtered.filter(({ entry }) =>
      getShortcutKey(entry).includes(lower) ||
      entry.url.toLowerCase().includes(lower) ||
      (entry.title || "").toLowerCase().includes(lower)
    );
  }

  if (state.showUsageStats && state.sortByUsage) {
    filtered.sort((a, b) => {
      const aUsage = getUsageCount(usageStats, a.entry);
      const bUsage = getUsageCount(usageStats, b.entry);
      return state.sortDescending ? bUsage - aUsage : aUsage - bUsage;
    });
  }

  updateSortArrow();

  if (!filtered.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = filterText ? "No shortcuts match your filter." : "No shortcuts yet. Add one above.";
    row.appendChild(cell);
    el.list.appendChild(row);
    return;
  }

  filtered.forEach(({ entry, index }) => {
    const row = document.createElement("tr");
    row.dataset.index = String(index);

    const shortcutCell = document.createElement("td");
    shortcutCell.textContent = getShortcutKey(entry);

    const urlCell = document.createElement("td");
    urlCell.className = "url-col";
    const urlCode = document.createElement("code");
    urlCode.textContent = entry.url;
    urlCode.title = entry.url;
    urlCell.appendChild(urlCode);

    const titleCell = document.createElement("td");
    titleCell.textContent = entry.title || "-";

    const actionsCell = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "ghost icon-label";
    editBtn.innerHTML = `${ACTION_ICONS.edit}<span>Edit</span>`;
    editBtn.addEventListener("click", () => startShortcutEdit(index, entry));

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
    const usageCell = document.createElement("td");
    usageCell.className = "usage-cell usage-col";
    const count = getUsageCount(usageStats, entry);
    usageCell.textContent = count === 1 ? "1 use" : `${count} uses`;
    row.appendChild(usageCell);

    row.appendChild(actionsCell);
    el.list.appendChild(row);
  });
}

export function startShortcutEdit(index, entry) {
  state.currentEditIndex = index;
  setSelectedMode("shortcut");
  el.shortcutGroup.value = getShortcutGroup(entry);
  el.keyword.value = entry.keyword;
  el.url.value = entry.url;
  el.title.value = entry.title || "";
  updateModeUI();
  el.form.scrollIntoView({ behavior: "smooth", block: "start" });
  el.keyword.focus({ preventScroll: true });
  el.keyword.select();
  showToast("Editing shortcut. Update fields and save.", "info");
}

export async function removeShortcut(index) {
  const list = await getShortcuts();
  const entry = list[index];
  if (!entry) return;

  const usageKey = getShortcutKey(entry);
  list.splice(index, 1);
  await setShortcuts(list);
  await deleteUsage(usageKey);

  if (state.currentEditIndex === index) {
    resetForm();
  } else if (state.currentEditIndex !== null && state.currentEditIndex > index) {
    state.currentEditIndex -= 1;
  }

  showToast("Shortcut removed!");
  await refreshList();
}

export async function saveShortcut() {
  const group = normalizeSegment(el.shortcutGroup.value);
  const input = {
    group,
    keyword: el.keyword.value,
    url: el.url.value,
    title: el.title.value
  };

  const normalized = normalizeEntry(input);
  if (!normalized) {
    showToast("Enter a valid shortcut keyword and URL.", "error");
    return;
  }

  const [list, savedGroups] = await Promise.all([getShortcuts(), getGroups()]);
  const normalizedKey = getShortcutKey(normalized);
  const duplicateIndex = list.findIndex((entry) => getShortcutKey(entry) === normalizedKey);
  if (duplicateIndex !== -1 && duplicateIndex !== state.currentEditIndex) {
    showToast("That shortcut already exists.", "error");
    return;
  }

  let previousKey = "";
  if (state.currentEditIndex !== null) {
    previousKey = getShortcutKey(list[state.currentEditIndex]);
    list[state.currentEditIndex] = normalized;
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

export async function importShortcuts() {
  const file = el.importFile.files[0];
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
    el.importFile.value = "";
    await refreshList();
  } catch {
    showToast("Import failed: invalid JSON file.", "error");
  }
}

export async function exportShortcuts() {
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

export async function resetShortcuts() {
  const confirmed = window.confirm("Reset to default shortcuts? This replaces your current list.");
  if (!confirmed) return;

  await Promise.all([setShortcuts(DEFAULT_SHORTCUTS), setGroups([])]);
  resetForm();
  showToast("Defaults restored!");
  await refreshList();
}
