"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Logic to determine initial theme based on localStorage or system preference
    const saved = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (saved === 'dark' || (!saved && systemPrefersDark)) {
      setDark(true);
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      setDark(false);
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !dark;
    setDark(newDark);
    const root = document.documentElement;
    if (newDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      localStorage.setItem('theme', 'light');
    }
  };

  // Prevent hydration mismatch by rendering nothing until mounted
  if (!mounted) {
    return <div className="px-2 py-1 w-9 h-8"></div>; // Placeholder to prevent layout shift
  }

  return (
    <button
      onClick={toggleTheme}
      title={dark ? "Modo oscuro activo" : "Modo claro activo"}
      className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
    >
      {/* User requested: Moon = Dark Mode, Sun = Light Mode */}
      {dark ? '🌙' : '☀️'}
    </button>
  );
}
