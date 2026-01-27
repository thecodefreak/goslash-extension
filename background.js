const STORAGE_KEY = "shortcuts";

const DEFAULT_SHORTCUTS = [
  { keyword: "gm", url: "https://mail.google.com", title: "Gmail" },
  { keyword: "yt", url: "https://www.youtube.com", title: "YouTube" },
  { keyword: "gh", url: "https://github.com/{path}", title: "GitHub" },
  { keyword: "g", url: "https://www.google.com/search?q={query}", title: "Google" }
];

const keywordPattern = /^[a-z0-9][a-z0-9_-]*$/;

function ensureScheme(url) {
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
    return url;
  }
  return `https://${url}`;
}

function encodePath(path) {
  if (!path) {
    return "";
  }
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function parseInput(text) {
  let trimmed = (text || "").trim();
  if (trimmed.startsWith("/")) {
    trimmed = trimmed.slice(1);
  }
  if (!trimmed) {
    return null;
  }

  const whitespaceIndex = trimmed.search(/\s/);
  const beforeWhitespace = whitespaceIndex === -1 ? trimmed : trimmed.slice(0, whitespaceIndex);
  const query = whitespaceIndex === -1 ? "" : trimmed.slice(whitespaceIndex).trim();

  const slashIndex = beforeWhitespace.indexOf("/");
  const keyword = slashIndex === -1 ? beforeWhitespace : beforeWhitespace.slice(0, slashIndex);
  const path = slashIndex === -1 ? "" : beforeWhitespace.slice(slashIndex + 1);

  if (!keyword || !keywordPattern.test(keyword)) {
    return null;
  }

  return { keyword, path, query };
}

async function getShortcuts() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY, (data) => {
      const list = data[STORAGE_KEY];
      resolve(Array.isArray(list) ? list : []);
    });
  });
}

async function setShortcuts(list) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: list }, () => resolve());
  });
}

function applyTemplate(url, path, query) {
  const encodedPath = encodePath(path);
  const encodedQuery = query ? encodeURIComponent(query) : "";

  let result = url;
  result = result.replace(/\{path\}/g, encodedPath);
  result = result.replace(/\{query\}/g, encodedQuery);
  return result;
}

async function handleInput(text) {
  const parsed = parseInput(text);
  if (!parsed) {
    return;
  }

  const shortcuts = await getShortcuts();
  const match = shortcuts.find((entry) => entry.keyword === parsed.keyword);
  if (!match || !match.url) {
    return;
  }

  const target = applyTemplate(match.url, parsed.path, parsed.query);
  const finalUrl = ensureScheme(target);

  const tabs = await new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (result) => resolve(result));
  });
  const activeTab = tabs && tabs.length ? tabs[0] : null;
  if (activeTab && activeTab.id) {
    chrome.tabs.update(activeTab.id, { url: finalUrl });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const shortcuts = await getShortcuts();
  if (!shortcuts.length) {
    await setShortcuts(DEFAULT_SHORTCUTS);
  }
});

chrome.omnibox.onInputEntered.addListener((text) => {
  handleInput(text);
});
