const STORAGE_KEY = "shortcuts";
const GROUPS_KEY = "groups";

const DEFAULT_SHORTCUTS = [
  { keyword: "gm", url: "https://mail.google.com", title: "Gmail" },
  { keyword: "yt", url: "https://www.youtube.com", title: "YouTube" },
  { keyword: "gh", url: "https://github.com/{path}", title: "GitHub" },
  { keyword: "g", url: "https://www.google.com/search?q={query}", title: "Google Search" }
];

const KEYWORD_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

function normalizeSegment(value) {
  return String(value || "").trim().toLowerCase();
}

function getShortcutGroup(entry) {
  const group = normalizeSegment(entry?.group || "");
  if (!group || !KEYWORD_PATTERN.test(group)) return "";
  return group;
}

function getShortcutKey(entry) {
  const keyword = normalizeSegment(entry?.keyword || "");
  if (!keyword || !KEYWORD_PATTERN.test(keyword)) return "";

  const group = getShortcutGroup(entry);
  if (!group) return keyword;
  return `${group}/${keyword}`;
}

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

function normalizeGroupList(list) {
  if (!Array.isArray(list)) return [];

  return [...new Set(list.map((group) => normalizeSegment(group)).filter((group) => KEYWORD_PATTERN.test(group)))];
}

function getGroups() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(GROUPS_KEY, (data) => {
      resolve(normalizeGroupList(data[GROUPS_KEY]));
    });
  });
}

function setGroups(list) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [GROUPS_KEY]: normalizeGroupList(list) }, () => resolve());
  });
}

const USAGE_KEY = "usage";

function getUsageStats() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(USAGE_KEY, (data) => {
      resolve(data[USAGE_KEY] || {});
    });
  });
}

function setUsageStats(stats) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [USAGE_KEY]: stats || {} }, () => resolve());
  });
}

function incrementUsage(keyword) {
  return getUsageStats().then((stats) => {
    stats[keyword] = (stats[keyword] || 0) + 1;
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [USAGE_KEY]: stats }, resolve);
    });
  });
}

function deleteUsage(keyword) {
  return getUsageStats().then((stats) => {
    delete stats[keyword];
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [USAGE_KEY]: stats }, resolve);
    });
  });
}
