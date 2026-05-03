import { ACTION_ICONS, MODE_GROUP, el, state, clearGroupEditState, getGroupsFromShortcuts, mergeGroups } from "./state.js";
import { confirmAction, setSelectedMode, showToast, updateModeUI } from "./ui.js";

let refreshList = async () => {};

export function setGroupRefreshHandler(handler) {
  refreshList = handler;
}

export function getGroupUsageMap(list) {
  const counts = {};
  list.forEach((entry) => {
    const group = getShortcutGroup(entry);
    if (!group) return;
    counts[group] = (counts[group] || 0) + 1;
  });
  return counts;
}

function hasDuplicateShortcutKeys(list) {
  const seen = new Set();
  for (const entry of list) {
    const key = getShortcutKey(entry);
    if (!key) continue;
    if (seen.has(key)) return key;
    seen.add(key);
  }
  return "";
}

export function renderGroups(groups, groupUsageMap) {
  el.groupsList.innerHTML = "";

  if (!groups.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.textContent = "No groups yet. Create one above.";
    row.appendChild(cell);
    el.groupsList.appendChild(row);
    return;
  }

  groups.forEach((group) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.className = "shortcut-col";
    const chip = document.createElement("span");
    chip.className = "shortcut-chip";
    const key = document.createElement("span");
    key.className = "shortcut-chip-key";
    key.textContent = group;
    chip.append(key);
    nameCell.appendChild(chip);

    const countCell = document.createElement("td");
    const countBadge = document.createElement("span");
    countBadge.className = "group-count";
    countBadge.textContent = String(groupUsageMap[group] || 0);
    countCell.appendChild(countBadge);

    const actionsCell = document.createElement("td");

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "ghost icon-label";
    editBtn.innerHTML = `${ACTION_ICONS.edit}<span>Edit</span>`;
    editBtn.addEventListener("click", () => {
      startGroupEdit(group);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "danger icon-label";
    deleteBtn.innerHTML = `${ACTION_ICONS.delete}<span>Delete</span>`;
    deleteBtn.addEventListener("click", () => {
      deleteGroup(group);
    });

    const actionsWrap = document.createElement("div");
    actionsWrap.className = "row-actions";
    actionsWrap.append(editBtn, deleteBtn);
    actionsCell.appendChild(actionsWrap);

    row.appendChild(nameCell);
    row.appendChild(countCell);
    row.appendChild(actionsCell);

    el.groupsList.appendChild(row);
  });
}

export function startGroupEdit(group) {
  state.currentGroupEditName = group;
  setSelectedMode(MODE_GROUP);
  el.groupName.value = group;
  el.groupName.focus({ preventScroll: true });
  el.groupName.select();
}

export async function saveGroup() {
  const nextName = normalizeSegment(el.groupName.value);
  if (!nextName || !KEYWORD_PATTERN.test(nextName)) {
    showToast("Enter a valid group name.", "error");
    return;
  }

  const [savedGroups, shortcuts] = await Promise.all([getGroups(), getShortcuts()]);
  const allGroups = mergeGroups(savedGroups, getGroupsFromShortcuts(shortcuts));

  if (!state.currentGroupEditName) {
    if (allGroups.includes(nextName)) {
      showToast("That group already exists.", "error");
      return;
    }

    await setGroups([...savedGroups, nextName]);
    el.groupName.value = "";
    showToast("Group saved!");
    await refreshList();
    return;
  }

  const oldName = state.currentGroupEditName;
  if (!allGroups.includes(oldName)) {
    clearGroupEditState({ clearInput: true });
    updateModeUI();
    showToast("Group no longer exists.", "error");
    await refreshList();
    return;
  }

  if (nextName !== oldName && allGroups.includes(nextName)) {
    showToast("That group already exists.", "error");
    return;
  }

  if (nextName === oldName) {
    clearGroupEditState({ clearInput: true });
    updateModeUI();
    showToast("No changes made.", "info");
    return;
  }

  const renamedShortcuts = shortcuts.map((entry) => {
    if (getShortcutGroup(entry) !== oldName) return entry;
    return { ...entry, group: nextName };
  });

  const duplicateKey = hasDuplicateShortcutKeys(renamedShortcuts);
  if (duplicateKey) {
    showToast(`Rename would duplicate shortcut: ${duplicateKey}`, "error");
    return;
  }

  const usageStats = await getUsageStats();
  const changedShortcuts = shortcuts.filter((entry) => getShortcutGroup(entry) === oldName);
  changedShortcuts.forEach((entry) => {
    const oldKey = getShortcutKey(entry);
    const newKey = `${nextName}/${entry.keyword}`;
    if (oldKey === newKey) return;
    if (!Object.prototype.hasOwnProperty.call(usageStats, oldKey)) return;
    usageStats[newKey] = (usageStats[newKey] || 0) + usageStats[oldKey];
    delete usageStats[oldKey];
  });

  const updatedGroups = allGroups.map((group) => (group === oldName ? nextName : group));
  await Promise.all([
    setShortcuts(renamedShortcuts),
    setGroups(updatedGroups),
    setUsageStats(usageStats)
  ]);

  clearGroupEditState({ clearInput: true });
  updateModeUI();
  showToast("Group updated. Linked shortcuts were renamed.");
  await refreshList();
}

export async function deleteGroup(group) {
  const [savedGroups, shortcuts] = await Promise.all([getGroups(), getShortcuts()]);
  const linkedCount = shortcuts.filter((entry) => getShortcutGroup(entry) === group).length;

  if (linkedCount > 0) {
    showToast("Cannot delete group with linked shortcuts.", "error");
    return;
  }

  if (!savedGroups.includes(group)) {
    showToast("Group no longer exists.", "error");
    await refreshList();
    return;
  }

  const confirmed = await confirmAction({
    title: "Delete group?",
    message: `Group “${group}” will be permanently removed.`,
    confirmLabel: "Delete group"
  });
  if (!confirmed) return;

  const nextGroups = savedGroups.filter((item) => item !== group);
  await setGroups(nextGroups);

  if (state.currentGroupEditName === group) {
    clearGroupEditState({ clearInput: true });
    updateModeUI();
  }

  showToast("Group deleted.");
  await refreshList();
}
