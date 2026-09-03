'use client';

import * as React from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'theme',
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey) as Theme | null;
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored;
      }
    }
    return defaultTheme;
  });

  // The pre-hydration script in app/layout.tsx has already set the class on
  // <html>; read it so the first client render matches what's on screen.
  const [resolvedTheme, setResolvedTheme] = React.useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return defaultTheme === 'dark' ? 'dark' : 'light';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  // Apply theme to document element
  const applyTheme = React.useCallback(
    (targetTheme: Theme) => {
      if (typeof window === 'undefined') return;

      const root = document.documentElement;
      let effectiveTheme: 'light' | 'dark' = 'dark';

      if (targetTheme === 'system') {
        effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      } else {
        effectiveTheme = targetTheme;
      }

      setResolvedTheme(effectiveTheme);

      if (effectiveTheme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        root.style.colorScheme = 'light';
      }
    },
    []
  );

  const setTheme = React.useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch {
        // Ignore localStorage quota errors
      }
      applyTheme(newTheme);
    },
    [storageKey, applyTheme]
  );

  // Apply the persisted theme to the DOM on mount & listen to system theme changes
  React.useEffect(() => {
    const stored = (localStorage.getItem(storageKey) as Theme | null) || defaultTheme;
    // Defer to a frame: avoids synchronous setState during effect flush
    const raf = requestAnimationFrame(() => applyTheme(stored));

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const currentStored = (localStorage.getItem(storageKey) as Theme | null) || defaultTheme;
      if (currentStored === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      cancelAnimationFrame(raf);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [storageKey, defaultTheme, applyTheme]);

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
    }),
    [theme, setTheme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = React.useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'dark',
      setTheme: () => {},
      resolvedTheme: 'dark',
    };
  }
  return context;
}
