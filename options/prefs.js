const PREFS_KEY = "prefs";
const PREFS_CACHE_KEY = "goslash:prefs";

const DEFAULTS = { theme: "system", density: "compact" };

function readCache() {
  try {
    const raw = localStorage.getItem(PREFS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(prefs) {
  try {
    localStorage.setItem(PREFS_CACHE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota / privacy errors
  }
}

export function normalizePrefs(input) {
  const theme = ["system", "light", "dark"].includes(input?.theme) ? input.theme : DEFAULTS.theme;
  const density = ["compact", "comfortable"].includes(input?.density) ? input.density : DEFAULTS.density;
  return { theme, density };
}

export function applyPrefs(prefs) {
  const normalized = normalizePrefs(prefs);
  const root = document.documentElement;
  if (normalized.theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", normalized.theme);
  }
  document.documentElement.classList.toggle("comfortable", normalized.density === "comfortable");
  return normalized;
}

export function loadPrefs() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(PREFS_KEY, (data) => {
      const prefs = normalizePrefs(data[PREFS_KEY]);
      writeCache(prefs);
      resolve(prefs);
    });
  });
}

export function savePrefs(prefs) {
  const normalized = normalizePrefs(prefs);
  writeCache(normalized);
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [PREFS_KEY]: normalized }, () => resolve(normalized));
  });
}

// Synchronous bootstrap from localStorage so first paint matches the user's choice.
export function bootstrapPrefsFromCache() {
  return applyPrefs(readCache() || DEFAULTS);
}
