"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import ThemeToggle from "./ThemeToggle";

type Props = {
  children: ReactNode;
};

export default function Layout({ children }: Props) {
  const isLoginPage = usePathname() === "/login";

  return (
    <div className={`flex h-screen flex-col transition-colors duration-300 ${isLoginPage ? "login-bg-texture" : "bg-gray-50 dark:bg-gray-900"}`}>
      <header className={`flex h-14 shrink-0 items-center justify-between border-b px-4 ${isLoginPage ? "border-transparent bg-transparent" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"}`}>
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white" aria-label="ConstruPlan, ir a proyectos">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">C</span>
          <span>ConstruPlan</span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="min-h-0 flex-1 overflow-auto bg-gray-50 transition-colors duration-300 dark:bg-gray-900">
        {children}
      </main>
    </div>
  );
}
