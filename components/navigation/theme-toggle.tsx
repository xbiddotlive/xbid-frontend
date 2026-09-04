"use client";

import { useThemeMode } from "@/lib/theme/theme-context";
import { useI18n } from "@/lib/i18n/locale-context";

function MoonIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <path d="M19 15.3A8 8 0 0 1 8.7 5a7.5 7.5 0 1 0 10.3 10.3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

export function ThemeToggle() {
  const { mode, setMode } = useThemeMode();
  const { t } = useI18n();
  const nextMode = mode === "dark" ? "light" : "dark";
  const label = t(nextMode === "light" ? "theme.toLight" : "theme.toDark");

  return (
    <button
      aria-label={label}
      aria-pressed={mode === "light"}
      className="themeToggle"
      onClick={() => setMode(nextMode)}
      title={label}
      type="button"
    >
      {mode === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
