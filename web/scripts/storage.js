export const STORAGE_KEY = "sibar.reader.workspace.v1";
export const LEGACY_STORAGE_KEY = "sibi.article.workspace.v1";
export const HISTORY_KEY = "sibar.reader.history.v1";
export const LEGACY_HISTORY_KEY = "sibi.article.history.v1";
export const HISTORY_LIMIT = 20;
export const SOURCE_TRIAL_KEY = "sibar.reader.sourceTrial.v1";
export const SOURCE_TRIAL_LIMIT = 3;

export function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function isHistoryUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function workspaceKey(article) {
  return article.url;
}

export function loadWorkspaceStore() {
  const store = loadJson(STORAGE_KEY, null) ?? loadJson(LEGACY_STORAGE_KEY, {});
  return store && typeof store === "object" && !Array.isArray(store) ? store : {};
}

export function saveWorkspaceStore(store) {
  saveJson(STORAGE_KEY, store);
}

export function getSavedWorkspaceByUrl(url) {
  return loadWorkspaceStore()[url] || null;
}

export function loadHistory() {
  const history = loadJson(HISTORY_KEY, null) ?? loadJson(LEGACY_HISTORY_KEY, []);
  if (!Array.isArray(history)) return [];
  const filtered = history.filter((item) => item && isHistoryUrl(item.url)).slice(0, HISTORY_LIMIT);
  if (filtered.length !== history.length) saveJson(HISTORY_KEY, filtered);
  return filtered;
}

export function nextHistory(history, article, noteCount) {
  if (!isHistoryUrl(article.url)) return history;

  const nextItem = {
    url: article.url,
    title: article.title,
    host: article.host,
    noteCount,
    lastOpenedAt: new Date().toISOString()
  };

  return [nextItem, ...history.filter((item) => item.url !== article.url)]
    .filter((item) => item && isHistoryUrl(item.url))
    .slice(0, HISTORY_LIMIT);
}

export function loadSourceTrial() {
  const trial = loadJson(SOURCE_TRIAL_KEY, { urls: [] });
  const urls = Array.isArray(trial?.urls)
    ? trial.urls.filter(isHistoryUrl).slice(0, SOURCE_TRIAL_LIMIT)
    : [];
  return { urls };
}

export function isSourceTrialBlocked(url) {
  const trial = loadSourceTrial();
  return !trial.urls.includes(url) && trial.urls.length >= SOURCE_TRIAL_LIMIT;
}

export function recordSourceTrialUrl(url) {
  if (!isHistoryUrl(url)) return loadSourceTrial();
  const trial = loadSourceTrial();
  if (trial.urls.includes(url)) return trial;
  const next = { urls: [...trial.urls, url].slice(0, SOURCE_TRIAL_LIMIT) };
  saveJson(SOURCE_TRIAL_KEY, next);
  return next;
}
