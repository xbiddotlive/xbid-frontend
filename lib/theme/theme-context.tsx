"use client";

import { createContext, useContext } from "react";

export type ThemeMode = "dark" | "light";

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useThemeMode() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("theme context is unavailable");
  return value;
}
