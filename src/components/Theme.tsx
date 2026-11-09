'use client';
import { ThemeProvider, useTheme } from 'next-themes';
import { useEffect, useId, useSyncExternalStore } from 'react';
import { IconMoon, IconSun } from './icons';
import { useT } from '@/lib/i18n';
import { forgetThemeColors, getThemeColor } from '@/lib/theme';

/**
 * Light (Kagaz) / dark (Raat), defaulting to the visitor's system setting. next-themes writes
 * data-theme on <html> from a blocking script before first paint, remembers a choice in
 * localStorage (`sc-theme`; blocked storage falls back to System), syncs open tabs and follows
 * the OS live in System mode. Without JavaScript the CSS media query decides.
 */
export function Themes({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="sc-theme" themes={['light', 'dark']}>
      <ThemeMeta />
      {children}
    </ThemeProvider>
  );
}

/** Mounted on the client (false during SSR and hydration), so theme-dependent labels never mismatch. */
const noop = () => () => {};
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

/**
 * <meta name="theme-color"> follows the active theme, not only the OS (browser UI colour).
 * Driven by the data-theme attribute itself: next-themes sets it in its own (parent) effect,
 * which runs after any effect here.
 */
function ThemeMeta() {
  useEffect(() => {
    const html = document.documentElement;
    const apply = () => {
      forgetThemeColors();
      const color = getThemeColor('--theme-color');
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => (m.content = color));
    };
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return null;
}

/** Header sun/moon: switches Light ↔ Dark. Both icons render; CSS shows the right one. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useT();
  const mounted = useMounted();
  const dark = mounted && resolvedTheme === 'dark';
  return (
    <button
      type="button"
      className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-fg hover:text-gold-text ${className}`}
      aria-label={mounted ? t(dark ? 'toLight' : 'toDark') : t('toggleTheme')}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      {/* the icon shows where the button takes you */}
      <IconMoon className="dark:hidden" />
      <IconSun className="hidden dark:block" />
    </button>
  );
}

/** Footer: Theme · System / Light / Dark (a radio group, so System can be chosen again). */
export function ThemeChoice({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const t = useT();
  const mounted = useMounted();
  const name = useId();
  const options = [
    ['system', t('themeSystem')],
    ['light', t('themeLight')],
    ['dark', t('themeDark')],
  ] as const;
  return (
    <fieldset className={`flex flex-wrap items-center gap-2 ${className}`}>
      <legend className="label float-left mr-2 text-gold-text">{t('theme')}</legend>
      <div role="radiogroup" aria-label={t('theme')} className="flex items-center rounded-full p-0.5 ring-1 ring-field-line">
        {options.map(([value, label]) => {
          const on = mounted && (theme ?? 'system') === value;
          return (
            <label
              key={value}
              className={`relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full px-3 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${on ? 'bg-cta-bg text-cta-text' : 'text-fg-muted hover:text-gold-text'}`}
            >
              <input type="radio" name={name} value={value} checked={on} onChange={() => setTheme(value)} className="sr-only" />
              {label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
