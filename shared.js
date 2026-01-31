const STORAGE_KEY = "shortcuts";

const DEFAULT_SHORTCUTS = [
  { keyword: "gm", url: "https://mail.google.com", title: "Gmail" },
  { keyword: "yt", url: "https://www.youtube.com", title: "YouTube" },
  { keyword: "gh", url: "https://github.com/{path}", title: "GitHub" },
  { keyword: "g", url: "https://www.google.com/search?q={query}", title: "Google Search" }
];

const KEYWORD_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

function ensureScheme(url) {
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
    return url;
  }
  return `https://${url}`;
}

function getShortcuts() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY, (data) => {
      const list = data[STORAGE_KEY];
      resolve(Array.isArray(list) ? list : []);
    });
  });
}

function setShortcuts(list) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: list }, () => resolve());
  });
}
