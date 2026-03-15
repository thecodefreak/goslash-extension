importScripts("shared.js");

const MAX_SUGGESTIONS = 5;

function encodePath(path) {
  if (!path) return "";
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
  if (!trimmed) return null;

  const whitespaceIndex = trimmed.search(/\s/);
  const route = whitespaceIndex === -1 ? trimmed : trimmed.slice(0, whitespaceIndex);
  const query = whitespaceIndex === -1 ? "" : trimmed.slice(whitespaceIndex).trim();
  if (!route) return null;
  return { route, query };
}

function applyTemplate(url, path, query) {
  const encodedPath = encodePath(path);
  const encodedQuery = query ? encodeURIComponent(query) : "";

  let result = url;
  result = result.replace(/\{path\}/g, encodedPath);
  result = result.replace(/\{query\}/g, encodedQuery);
  return result;
}

function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildDescription(entry, matchedKeyword) {
  const shortcutKey = getShortcutKey(entry);
  const keyword = escapeXml(shortcutKey);
  const label = escapeXml(entry.title || entry.url);

  // Highlight the matched portion of the keyword
  if (matchedKeyword && shortcutKey.startsWith(matchedKeyword.toLowerCase())) {
    const matchPart = keyword.slice(0, matchedKeyword.length);
    const restPart = keyword.slice(matchedKeyword.length);
    return `<match>${matchPart}</match>${restPart} <dim>- ${label}</dim>`;
  }

  return `<match>${keyword}</match> <dim>- ${label}</dim>`;
}

function resolveMatch(shortcuts, route) {
  const lowerRoute = route.toLowerCase();
  let bestMatch = null;

  shortcuts.forEach((entry) => {
    const key = getShortcutKey(entry);
    if (!key) return;

    if (lowerRoute === key || lowerRoute.startsWith(`${key}/`)) {
      const path = lowerRoute === key ? "" : route.slice(key.length + 1);
      if (!bestMatch || key.length > bestMatch.key.length) {
        bestMatch = { entry, key, path };
      }
    }
  });

  return bestMatch;
}

async function navigate(url, disposition) {
  const finalUrl = ensureScheme(url);

  if (disposition === "newForegroundTab") {
    chrome.tabs.create({ url: finalUrl, active: true });
  } else if (disposition === "newBackgroundTab") {
    chrome.tabs.create({ url: finalUrl, active: false });
  } else {
    // currentTab (default)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.update(tab.id, { url: finalUrl });
    }
  }
}

async function handleInput(text, disposition) {
  const trimmed = (text || "").trim();

  // Special case: "/" opens the options page
  if (trimmed === "/") {
    chrome.runtime.openOptionsPage();
    return;
  }

  const parsed = parseInput(text);
  if (!parsed) return;

  const shortcuts = await getShortcuts();
  const match = resolveMatch(shortcuts, parsed.route);
  if (!match?.entry?.url) return;

  const target = applyTemplate(match.entry.url, match.path, parsed.query);
  await incrementUsage(match.key);
  await navigate(target, disposition);
}

// Set default suggestion when user starts typing
chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({
    description: "Type a shortcut (e.g., yt, council/tax) or <match>/</match> for settings"
  });
});

// Provide suggestions as user types
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const trimmed = (text || "").trim();

  // Special case: "/" shows options hint
  if (trimmed === "/") {
    chrome.omnibox.setDefaultSuggestion({
      description: "<match>Open GoSlash settings</match>"
    });
    suggest([]);
    return;
  }

  const parsed = parseInput(text);

  getShortcuts().then((shortcuts) => {
    if (!parsed) {
      // Empty input - show hint + all shortcuts in dropdown
      chrome.omnibox.setDefaultSuggestion({
        description: "Type a shortcut (e.g., yt, council/tax) or <match>/</match> for settings"
      });
      const suggestions = shortcuts
        .map((entry) => ({ entry, key: getShortcutKey(entry) }))
        .filter(({ key }) => Boolean(key))
        .slice(0, MAX_SUGGESTIONS)
        .map(({ entry, key }) => ({
          content: key,
          description: buildDescription(entry, "")
        }));
      suggest(suggestions);
      return;
    }

    const exactMatch = resolveMatch(shortcuts, parsed.route);

    if (exactMatch) {
      // Show title prominently in default suggestion
      const title = escapeXml(exactMatch.entry.title || exactMatch.key);
      const url = escapeXml(exactMatch.entry.url);
      chrome.omnibox.setDefaultSuggestion({
        description: `<match>${title}</match> <dim>- ${url}</dim>`
      });
    } else {
      // No exact match - clear the hint
      chrome.omnibox.setDefaultSuggestion({
        description: `<dim>No match for:</dim> ${escapeXml(parsed.route)}`
      });
    }

    // Dropdown: show prefix matches EXCLUDING exact match
    const otherMatches = shortcuts
      .map((entry) => ({ entry, key: getShortcutKey(entry) }))
      .filter(
        ({ key }) =>
          Boolean(key) && key.startsWith(parsed.route.toLowerCase()) && key !== parsed.route.toLowerCase()
      )
      .slice(0, MAX_SUGGESTIONS);

    const suggestions = otherMatches.map(({ entry, key }) => {
      let content = key;
      if (parsed.query) content += " " + parsed.query;
      return {
        content,
        description: buildDescription(entry, parsed.route)
      };
    });

    suggest(suggestions);
  });
});

// Handle selection
chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  handleInput(text, disposition);
});

// Initialize defaults on install
chrome.runtime.onInstalled.addListener(async () => {
  const shortcuts = await getShortcuts();
  if (!shortcuts.length) {
    await setShortcuts(DEFAULT_SHORTCUTS);
  }
});

