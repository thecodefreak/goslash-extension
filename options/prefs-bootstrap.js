// Runs synchronously in <head> before paint to apply theme + density from
// the localStorage cache, avoiding a flash of the wrong appearance.
(function () {
  try {
    var raw = localStorage.getItem("goslash:prefs");
    var p = raw ? JSON.parse(raw) : null;
    var theme = p && (p.theme === "light" || p.theme === "dark") ? p.theme : null;
    if (theme) document.documentElement.setAttribute("data-theme", theme);
    if (p && p.density === "comfortable") {
      document.documentElement.classList.add("comfortable");
    }
  } catch (_) {}
})();
