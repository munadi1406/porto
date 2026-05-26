"use client";

import { create } from "zustand";

interface ThemeStore {
  theme: "light" | "dark";
  toggle: () => void;
  setTheme: (t: "light" | "dark") => void;
}

function getInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("porto-theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  localStorage.setItem("porto-theme", theme);
}

export const useTheme = create<ThemeStore>((set) => {
  const initial = getInitialTheme();
  if (typeof window !== "undefined") applyTheme(initial);
  return {
    theme: initial,
    toggle: () =>
      set((state) => {
        const next = state.theme === "light" ? "dark" : "light";
        applyTheme(next);
        return { theme: next };
      }),
    setTheme: (t) => {
      applyTheme(t);
      set({ theme: t });
    },
  };
});
