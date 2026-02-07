// shared.js must be loaded before this file

const elements = {
  form: document.getElementById("shortcut-form"),
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
let showUsageStats = false;
let sortByUsage = false;
let sortDescending = true;

const TOAST_ICONS = {
  success: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
  error: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`,
  info: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`
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

function resetForm() {
  elements.form.reset();
  currentEditIndex = null;
  elements.saveBtn.textContent = "Save shortcut";
  elements.cancelBtn.hidden = true;
}

function normalizeEntry(entry) {
  const keyword = (entry.keyword || "").trim().toLowerCase();
  const url = (entry.url || "").trim();
  const title = (entry.title || "").trim();

  if (!keyword || !KEYWORD_PATTERN.test(keyword)) return null;
  if (!url) return null;

  return {
    keyword,
    url: ensureScheme(url),
    title: title || ""
  };
}

function updateSortArrow() {
  if (!showUsageStats) return;
  const arrow = sortByUsage ? (sortDescending ? " \u25BC" : " \u25B2") : "";
  elements.usageHeader.textContent = "Usage" + arrow;
}

function render(list, usageStats = {}, filterText = "") {
  elements.list.innerHTML = "";

  // Filter by keyword, URL, or title
  let filtered = list.map((entry, index) => ({ entry, index }));
  if (filterText) {
    const lower = filterText.toLowerCase();
    filtered = filtered.filter(({ entry }) =>
      entry.keyword.toLowerCase().includes(lower) ||
      entry.url.toLowerCase().includes(lower) ||
      (entry.title || "").toLowerCase().includes(lower)
    );
  }

  // Sort by usage if enabled
  if (showUsageStats && sortByUsage) {
    filtered.sort((a, b) => {
      const aUsage = usageStats[a.entry.keyword] || 0;
      const bUsage = usageStats[b.entry.keyword] || 0;
      return sortDescending ? bUsage - aUsage : aUsage - bUsage;
    });
  }

  // Update header arrow
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

    const keywordCell = document.createElement("td");
    keywordCell.textContent = entry.keyword;

    const urlCell = document.createElement("td");
    const urlCode = document.createElement("code");
    urlCode.textContent = entry.url;
    urlCell.appendChild(urlCode);

    const titleCell = document.createElement("td");
    titleCell.textContent = entry.title || "-";

    const actionsCell = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "Edit";
    editBtn.className = "ghost";
    editBtn.addEventListener("click", () => startEdit(index, entry));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "danger";
    deleteBtn.addEventListener("click", () => removeShortcut(index));

    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(deleteBtn);
    actionsCell.style.display = "flex";
    actionsCell.style.gap = "8px";

    row.appendChild(keywordCell);
    row.appendChild(urlCell);
    row.appendChild(titleCell);

    // Add usage cell if visible
    if (showUsageStats) {
      const usageCell = document.createElement("td");
      usageCell.className = "usage-cell usage-col";
      const count = usageStats[entry.keyword] || 0;
      usageCell.textContent = count === 1 ? "1 use" : `${count} uses`;
      row.appendChild(usageCell);
    }

    row.appendChild(actionsCell);

    elements.list.appendChild(row);
  });
}

async function refreshList() {
  const list = await getShortcuts();
  const usageStats = await getUsageStats();
  const filterText = elements.searchInput.value.trim();
  render(list, usageStats, filterText);
}

function startEdit(index, entry) {
  currentEditIndex = index;
  elements.keyword.value = entry.keyword;
  elements.url.value = entry.url;
  elements.title.value = entry.title || "";
  elements.saveBtn.textContent = "Update shortcut";
  elements.cancelBtn.hidden = false;
  showToast("Editing shortcut. Update fields and save.", "info");
}

async function removeShortcut(index) {
  const list = await getShortcuts();
  const keyword = list[index].keyword;
  list.splice(index, 1);
  await setShortcuts(list);
  await deleteUsage(keyword);
  if (currentEditIndex === index) {
    resetForm();
  }
  showToast("Shortcut removed!");
  await refreshList();
}

async function upsertShortcut(event) {
  event.preventDefault();
  const input = {
    keyword: elements.keyword.value,
    url: elements.url.value,
    title: elements.title.value
  };

  const normalized = normalizeEntry(input);
  if (!normalized) {
    showToast("Enter a valid keyword and URL.", "error");
    return;
  }

  const list = await getShortcuts();
  const duplicateIndex = list.findIndex((entry) => entry.keyword === normalized.keyword);
  if (duplicateIndex !== -1 && duplicateIndex !== currentEditIndex) {
    showToast("That keyword already exists.", "error");
    return;
  }

  if (currentEditIndex !== null) {
    list[currentEditIndex] = normalized;
    showToast("Shortcut updated!");
  } else {
    list.push(normalized);
    showToast("Shortcut saved!");
  }

  await setShortcuts(list);
  resetForm();
  await refreshList();
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

    const list = await getShortcuts();
    const existingKeywords = new Set(list.map((entry) => entry.keyword));
    let addedCount = 0;
    let skippedCount = 0;

    incoming.forEach((entry) => {
      const normalized = normalizeEntry(entry);
      if (!normalized) {
        skippedCount += 1;
        return;
      }
      if (existingKeywords.has(normalized.keyword)) {
        skippedCount += 1;
        return;
      }
      list.push(normalized);
      existingKeywords.add(normalized.keyword);
      addedCount += 1;
    });

    await setShortcuts(list);
    showToast(`Imported ${addedCount} shortcut(s), skipped ${skippedCount}.`);
    elements.importFile.value = "";
    await refreshList();
  } catch {
    showToast("Import failed: invalid JSON file.", "error");
  }
}

async function exportShortcuts() {
  const list = await getShortcuts();
  const manifest = chrome.runtime.getManifest();
  const exportData = {
    name: manifest.name,
    version: manifest.version,
    exportedAt: new Date().toISOString(),
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

  await setShortcuts(DEFAULT_SHORTCUTS);
  resetForm();
  showToast("Defaults restored!");
  await refreshList();
}

async function init() {
  const list = await getShortcuts();
  if (!list.length) {
    await setShortcuts(DEFAULT_SHORTCUTS);
  }
  await refreshList();
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
