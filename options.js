import { MODE_GROUP, el, state, clearGroupEditState } from "./options/state.js";
import { activateMode, getSelectedMode, resetForm, showToast, syncGroupOptions, updateModeUI } from "./options/ui.js";
import {
  exportShortcuts,
  importShortcuts,
  renderShortcuts,
  resetShortcuts,
  saveShortcut,
  setShortcutRefreshHandler
} from "./options/shortcuts.js";
import {
  getGroupUsageMap,
  renderGroups,
  saveGroup,
  setGroupRefreshHandler
} from "./options/groups.js";
import { initializeOptionsData, loadOptionsData } from "./options/data.js";

async function refreshList() {
  const { list, usageStats, allGroups } = await loadOptionsData();
  syncGroupOptions(allGroups);
  renderGroups(allGroups, getGroupUsageMap(list));
  renderShortcuts(list, usageStats, el.searchInput.value.trim());
}

function applyUsageColumnState() {
  const table = el.usageHeader?.closest("table");
  if (!table) return;
  table.classList.toggle("usage-visible", state.showUsageStats);
  el.usageHeader.hidden = false;
}

setShortcutRefreshHandler(refreshList);
setGroupRefreshHandler(refreshList);

el.form.addEventListener("submit", async (event) => {
  if (getSelectedMode() === MODE_GROUP) {
    event.preventDefault();
    await saveGroup();
    return;
  }
  event.preventDefault();
  await saveShortcut();
});

el.cancelBtn.addEventListener("click", () => {
  resetForm();
  showToast("Edit canceled.", "info");
});

el.groupCancelBtn.addEventListener("click", () => {
  clearGroupEditState({ clearInput: true });
  updateModeUI();
  showToast("Group edit canceled.", "info");
});

el.importBtn.addEventListener("click", importShortcuts);
el.exportBtn.addEventListener("click", exportShortcuts);
el.resetBtn.addEventListener("click", resetShortcuts);

el.modeTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => {
    activateMode(tab.dataset.mode);
  });

  tab.addEventListener("keydown", (event) => {
    const lastIndex = el.modeTabs.length - 1;
    let targetIndex = -1;

    if (event.key === "ArrowRight") {
      targetIndex = index === lastIndex ? 0 : index + 1;
    } else if (event.key === "ArrowLeft") {
      targetIndex = index === 0 ? lastIndex : index - 1;
    } else if (event.key === "Home") {
      targetIndex = 0;
    } else if (event.key === "End") {
      targetIndex = lastIndex;
    } else if (event.key === "Enter" || event.key === " ") {
      activateMode(tab.dataset.mode, { fromKeyboard: true });
      event.preventDefault();
      return;
    }

    if (targetIndex !== -1) {
      const targetTab = el.modeTabs[targetIndex];
      if (targetTab) {
        activateMode(targetTab.dataset.mode, { fromKeyboard: true });
      }
      event.preventDefault();
    }
  });
});

el.searchInput.addEventListener("input", refreshList);

el.showUsage.addEventListener("change", () => {
  state.showUsageStats = el.showUsage.checked;
  if (!state.showUsageStats) {
    state.sortByUsage = false;
  }
  applyUsageColumnState();
  refreshList();
});

el.usageHeader.addEventListener("click", () => {
  if (state.sortByUsage) {
    state.sortDescending = !state.sortDescending;
  } else {
    state.sortByUsage = true;
    state.sortDescending = true;
  }
  refreshList();
});

await initializeOptionsData();
await refreshList();
applyUsageColumnState();
resetForm();
