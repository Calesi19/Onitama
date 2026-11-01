import { useCallback, useEffect, useState } from 'react';

// Day follows the system until the player chooses; the choice is remembered.
const STORAGE_KEY = 'onitama-theme';
const THEME_COLOR = { light: '#F3ECDD', dark: '#141210' };

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

function storedTheme(): 'light' | 'dark' | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export function useNightDojo() {
  const [night, setNight] = useState(() => (storedTheme() ?? (systemDark() ? 'dark' : 'light')) === 'dark');

  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', night ? THEME_COLOR.dark : THEME_COLOR.light);
  }, [night]);

  const toggle = useCallback(() => {
    const next = !night;
    const theme = next ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* the choice just won't survive a reload */
    }
    setNight(next);
  }, [night]);

  return { night, toggle };
}
