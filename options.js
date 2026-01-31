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
  resetBtn: document.getElementById("reset-btn")
};

let currentEditIndex = null;

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

function render(list) {
  elements.list.innerHTML = "";

  if (!list.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = "No shortcuts yet. Add one above.";
    row.appendChild(cell);
    elements.list.appendChild(row);
    return;
  }

  list.forEach((entry, index) => {
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
    row.appendChild(actionsCell);

    elements.list.appendChild(row);
  });
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
  list.splice(index, 1);
  await setShortcuts(list);
  render(list);
  if (currentEditIndex === index) {
    resetForm();
  }
  showStatus("Shortcut removed.");
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
  render(list);
  resetForm();
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
    render(list);
    showStatus(`Imported ${addedCount} shortcut(s), skipped ${skippedCount}.`);
    elements.importFile.value = "";
  } catch {
    showStatus("Import failed: invalid JSON file.", "error");
  }
}

async function exportShortcuts() {
  const list = await getShortcuts();
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
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
  render(DEFAULT_SHORTCUTS);
  resetForm();
  showStatus("Defaults restored.");
}

async function init() {
  const list = await getShortcuts();
  if (!list.length) {
    await setShortcuts(DEFAULT_SHORTCUTS);
    render(DEFAULT_SHORTCUTS);
    return;
  }
  render(list);
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

init();
