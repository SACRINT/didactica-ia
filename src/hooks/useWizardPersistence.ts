'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * A generic hook that persists wizard form state to localStorage.
 * - Restores state automatically on page load/refresh
 * - Saves state automatically on every change
 * - Provides a `clearDraft()` function to call when the wizard finishes
 *
 * @param storageKey  Unique key for this wizard (e.g. 'didactica_planeacion_draft')
 * @param initialState  The default state when no saved draft exists
 */
export function useWizardPersistence<T>(storageKey: string, initialState: T) {
  const [state, setStateInternal] = useState<T>(() => {
    // Only run on client-side (Next.js SSR guard)
    if (typeof window === 'undefined') return initialState;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved) as T;
      }
    } catch (e) {
      console.warn(`[useWizardPersistence] Failed to restore draft for key "${storageKey}":`, e);
    }
    return initialState;
  });

  // Track if we have a saved draft (for UI indicators)
  const [hasDraft, setHasDraft] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!window.localStorage.getItem(storageKey);
  });

  // Prevent saving on the very first render (just restored from storage)
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
      setHasDraft(true);
    } catch (e) {
      console.warn(`[useWizardPersistence] Failed to save draft for key "${storageKey}":`, e);
    }
  }, [storageKey, state]);

  const setState = useCallback((update: T | ((prev: T) => T)) => {
    setStateInternal(update);
  }, []);

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
      setHasDraft(false);
    } catch (e) {
      console.warn(`[useWizardPersistence] Failed to clear draft for key "${storageKey}":`, e);
    }
  }, [storageKey]);

  return { state, setState, hasDraft, clearDraft };
}

/**
 * Clears all Didáctica-IA wizard drafts from localStorage.
 * Call this on sign-out.
 */
export function clearAllWizardDrafts() {
  const DRAFT_KEYS = [
    'didactica_planeacion_draft',
    'didactica_paec_draft',
    'didactica_pmc_draft',
  ];
  try {
    DRAFT_KEYS.forEach(key => window.localStorage.removeItem(key));
  } catch (e) {
    console.warn('[clearAllWizardDrafts] Failed to clear drafts:', e);
  }
}
