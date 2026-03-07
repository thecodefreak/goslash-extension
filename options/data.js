import { getGroupsFromShortcuts, mergeGroups } from "./state.js";

export async function loadOptionsData() {
  const [list, usageStats, savedGroups] = await Promise.all([
    getShortcuts(),
    getUsageStats(),
    getGroups()
  ]);

  return {
    list,
    usageStats,
    savedGroups,
    allGroups: mergeGroups(savedGroups, getGroupsFromShortcuts(list))
  };
}

export async function initializeOptionsData() {
  let list = await getShortcuts();
  if (!list.length) {
    await setShortcuts(DEFAULT_SHORTCUTS);
    list = DEFAULT_SHORTCUTS;
  }

  const savedGroups = await getGroups();
  const mergedGroups = mergeGroups(savedGroups, getGroupsFromShortcuts(list));
  await setGroups(mergedGroups);
}
