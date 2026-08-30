/**
 * LocalStorage manager for Terraria Research Tracker
 */
const STORAGE_KEY = 'terraria-research-tracker-state';

export interface SavedState {
  playerName: string;
  research: Record<string, number>;
  version: number;
  lastUpdated: number;
}

export function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedState;
  } catch {
    return null;
  }
}

export function saveState(state: SavedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export function updateItem(idOrName: string | number, amount: number) {
  const state = loadState();
  if (!state) return false;

  const itemName = typeof idOrName === 'number'
    ? String(idOrName)
    : String(idOrName);

  state.research[itemName] = amount;
  state.lastUpdated = Date.now();
  saveState(state);
  return true;
}

export function markItemDone(idOrName: string | number) {
  // For simplicity, set to a high value or fetch needed from DB; here we set 999
  return updateItem(idOrName, 999);
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}
