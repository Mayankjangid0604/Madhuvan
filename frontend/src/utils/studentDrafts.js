// Utility for storing student form drafts in localStorage
const STORAGE_KEY = "madhuvan_student_drafts";

export const loadDrafts = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persist = (drafts) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch (e) {
    console.error("Failed to persist drafts", e);
  }
};

export const saveDraft = (draft) => {
  const drafts = loadDrafts();
  const id = draft.id || `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const entry = {
    ...draft,
    id,
    updated_at: new Date().toISOString(),
    created_at: draft.created_at || new Date().toISOString()
  };
  const existingIndex = drafts.findIndex(d => d.id === id);
  if (existingIndex >= 0) {
    drafts[existingIndex] = entry;
  } else {
    drafts.unshift(entry);
  }
  persist(drafts);
  return entry;
};

export const deleteDraft = (id) => {
  const drafts = loadDrafts().filter(d => d.id !== id);
  persist(drafts);
  return drafts;
};

export const getDraft = (id) => {
  return loadDrafts().find(d => d.id === id) || null;
};

export const clearAllDrafts = () => {
  persist([]);
};
