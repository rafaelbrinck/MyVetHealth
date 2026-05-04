import { Injectable, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
/** Legacy key from early tutor mock */
const LEGACY_STORAGE_KEY = 'tema';

function readInitialTheme(): AppTheme {
  if (typeof localStorage === 'undefined') {
    return 'light';
  }
  let stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    stored = localStorage.getItem(LEGACY_STORAGE_KEY);
  }
  if (stored === 'dark') {
    return 'dark';
  }
  return 'light';
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** Current color scheme; persisted under `theme` in localStorage. */
  readonly theme = signal<AppTheme>(readInitialTheme());

  setTheme(next: AppTheme): void {
    this.theme.set(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  }

  toggleTheme(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }
}
