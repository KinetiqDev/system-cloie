(function () {
  var KEY = "cloie:appearance";

  function readStoredPreference() {
    try {
      var stored = window.localStorage.getItem(KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
      }
    } catch {
      return null;
    }
    return null;
  }

  function prefersDarkOperatingSystem() {
    try {
      return (
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches === true
      );
    } catch {
      return false;
    }
  }

  function resolveAppearance(preference, prefersDark) {
    if (preference === "dark" || (preference !== "light" && prefersDark)) {
      return "dark";
    }
    return "light";
  }

  function applyAppearance(resolved) {
    var root = document.documentElement;
    if (resolved === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.style.colorScheme = resolved;
  }

  applyAppearance(resolveAppearance(readStoredPreference(), prefersDarkOperatingSystem()));
})();
