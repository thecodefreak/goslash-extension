const form = document.getElementById("popup-form");
const keywordInput = document.getElementById("p-keyword");
const urlInput = document.getElementById("p-url");
const titleInput = document.getElementById("p-title");
const saveBtn = document.getElementById("save-btn");
const statusEl = document.getElementById("popup-status");
const tabTitlePreview = document.getElementById("tab-title-preview");

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (tab?.url?.startsWith("chrome-extension://")) {
    chrome.runtime.openOptionsPage();
    window.close();
    return;
  }
  if (tab?.url) {
    urlInput.value = tab.url;
  }
  if (tab?.title) {
    titleInput.value = tab.title;
    tabTitlePreview.textContent = tab.title;
  } else {
    tabTitlePreview.textContent = tab?.url || "Unknown page";
  }
  keywordInput.focus();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearStatus();

  const normalized = normalizeEntry({
    keyword: keywordInput.value,
    url: urlInput.value,
    title: titleInput.value
  });

  if (!normalized) {
    showStatus("Enter a valid keyword and URL.", "error");
    keywordInput.focus();
    return;
  }

  saveBtn.disabled = true;

  const list = await getShortcuts();
  const duplicate = list.some((entry) => getShortcutKey(entry) === getShortcutKey(normalized));
  if (duplicate) {
    showStatus(`"${getShortcutKey(normalized)}" already exists. Choose a different keyword.`, "error");
    saveBtn.disabled = false;
    keywordInput.focus();
    return;
  }

  list.push(normalized);
  await setShortcuts(list);

  showStatus(`Saved! Type  go ${getShortcutKey(normalized)}  in the address bar.`, "success");
  form.reset();
  setTimeout(() => window.close(), 2000);
});

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `popup-status ${type}`;
  statusEl.hidden = false;
}

function clearStatus() {
  statusEl.hidden = true;
  statusEl.textContent = "";
}
