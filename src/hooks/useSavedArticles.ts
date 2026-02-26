"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

// --- Types ---
export interface SavedArticleMeta {
  title: string;
  slug: string;
  imageUrl: string | null;
  excerpt: string;
  category?: string;
  savedAt: number; // timestamp
}

export type SavedArticlesMap = Record<string, SavedArticleMeta>;

// --- localStorage helpers ---
const STORAGE_KEY = "saved_articles_map";

function readMap(): SavedArticlesMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);

    // Backward compat: old format was Record<string, boolean>
    const result: SavedArticlesMap = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (
        typeof value === "object" &&
        value !== null &&
        "slug" in (value as object)
      ) {
        result[id] = value as SavedArticleMeta;
      }
      // skip old boolean entries — they have no metadata to display
    }
    return result;
  } catch {
    return {};
  }
}

function writeMap(map: SavedArticlesMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  // Dispatch custom event so other tabs/components stay in sync
  window.dispatchEvent(new Event("saved-articles-change"));
}

// --- External store for cross-component reactivity ---
let listeners: Array<() => void> = [];
let snapshot: SavedArticlesMap = {};

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): SavedArticlesMap {
  return snapshot;
}

function getServerSnapshot(): SavedArticlesMap {
  return {};
}

function refreshSnapshot() {
  snapshot = readMap();
  for (const listener of listeners) {
    listener();
  }
}

// Listen for storage events (other tabs) and our custom event (same tab)
if (typeof window !== "undefined") {
  snapshot = readMap();

  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) refreshSnapshot();
  });
  window.addEventListener("saved-articles-change", () => {
    refreshSnapshot();
  });
}

// --- Hook ---
export function useSavedArticles() {
  const map = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isSaved = useCallback((articleId: string) => articleId in map, [map]);

  const toggleSave = useCallback(
    (articleId: string, meta: Omit<SavedArticleMeta, "savedAt">) => {
      const current = readMap();
      if (articleId in current) {
        delete current[articleId];
      } else {
        current[articleId] = { ...meta, savedAt: Date.now() };
      }
      writeMap(current);
      refreshSnapshot();
    },
    [],
  );

  const removeSaved = useCallback((articleId: string) => {
    const current = readMap();
    delete current[articleId];
    writeMap(current);
    refreshSnapshot();
  }, []);

  const savedArticles = Object.entries(map)
    .map(([id, meta]) => ({ id, ...meta }))
    .sort((a, b) => b.savedAt - a.savedAt);

  const savedCount = savedArticles.length;

  return {
    map,
    savedArticles,
    savedCount,
    isSaved,
    toggleSave,
    removeSaved,
  };
}
