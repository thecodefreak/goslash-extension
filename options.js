// shared.js must be loaded before this file

const elements = {
  form: document.getElementById("shortcut-form"),
  keyword: document.getElementById("keyword"),
  url: document.getElementById("url"),
  title: document.getElementById("title"),
  saveBtn: document.getElementById("save-btn"),
  cancelBtn: document.getElementById("cancel-btn"),
  status: document.getElementById("status"),
  list: document.getElementById("shortcuts-list"),
  importFile: document.getElementById("import-file"),
  importBtn: document.getElementById("import-btn"),
  exportBtn: document.getElementById("export-btn"),
  resetBtn: document.getElementById("reset-btn"),
  searchInput: document.getElementById("search-input"),
  showUsage: document.getElementById("show-usage"),
  usageHeader: document.getElementById("usage-header")
};

let currentEditIndex = null;
let showUsageStats = false;
let sortByUsage = false;
let sortDescending = true;

function showStatus(message, type = "") {
  elements.status.textContent = message;
  elements.status.className = `status ${type}`.trim();
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
  showStatus("Editing shortcut. Update fields and save.");
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
  showStatus("Shortcut removed.");
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
    showStatus("Enter a valid keyword and URL.", "error");
    return;
  }

  const list = await getShortcuts();
  const duplicateIndex = list.findIndex((entry) => entry.keyword === normalized.keyword);
  if (duplicateIndex !== -1 && duplicateIndex !== currentEditIndex) {
    showStatus("That keyword already exists.", "error");
    return;
  }

  if (currentEditIndex !== null) {
    list[currentEditIndex] = normalized;
    showStatus("Shortcut updated.");
  } else {
    list.push(normalized);
    showStatus("Shortcut saved.");
  }

  await setShortcuts(list);
  resetForm();
  await refreshList();
}

async function importShortcuts() {
  const file = elements.importFile.files[0];
  if (!file) {
    showStatus("Choose a JSON file to import.", "error");
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const incoming = Array.isArray(parsed) ? parsed : parsed.shortcuts;
    if (!Array.isArray(incoming)) {
      showStatus("Import failed: JSON must be an array or {shortcuts: []}.", "error");
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
    showStatus(`Imported ${addedCount} shortcut(s), skipped ${skippedCount}.`);
    elements.importFile.value = "";
    await refreshList();
  } catch {
    showStatus("Import failed: invalid JSON file.", "error");
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
}

async function resetShortcuts() {
  const confirmed = window.confirm("Reset to default shortcuts? This replaces your current list.");
  if (!confirmed) return;

  await setShortcuts(DEFAULT_SHORTCUTS);
  resetForm();
  showStatus("Defaults restored.");
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
  showStatus("Edit canceled.");
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
